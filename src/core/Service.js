let Maindomain;
const _ = require('lodash');
const APIError = require("./APIError");
const Filter = require("../util/Filter");
const Sort = require('../util/Sort');
const { Logger } = require('../log');
const SelectInclude = require('../util/SelectInclude');
const TelemetryChain = require('../telemetry/TelemetryChain');

module.exports = class Service extends TelemetryChain {

    #domain;
    #domainPath;

    constructor(domainPath) {
        super();

        this.logger = Logger.createLogger({ name: this.constructor.name });

        if (domainPath && typeof domainPath === 'string') {
            Maindomain = require(domainPath);
            this.#domain = new Maindomain();
            this.#domainPath = domainPath;
        }
        else if (domainPath && typeof domainPath === 'object') {
            this.#domain = domainPath;
        }
    }

    get domain() {
        return this.#domain;
    }

    async get(id) {
        let rtn;
        if (id) {
            this.addTelemetryEvent('get', {recordId: id});
            rtn = await this.domain.get(id);
        } else {
            this.addTelemetryEvent('list', {recordId: id});
            rtn = await this.domain.list().where();
        }
        return rtn;
    }

    async save(id, body, session) {
        if (!session || !session.user) throw new APIError("Session data must be supplied to save.");

        let rtn;
        if (id) {
            this.addTelemetryEvent('update', {recordId: id, body: body, session: session});
            body.updated_user = session.user;
            await this.domain.save(body, id);
            rtn = await this.domain.get(id);
        } else {
            this.addTelemetryEvent('create', {body: body, session: session});
            body.updated_user = session.user;
            body.created_user = session.user;
            try {
                rtn = await this.domain.save(body);
            }
            catch (e) {
                rtn = await this.domain.save(body)
            }
        }
        return rtn;
    }

    async remove(id, session) {
        this.addTelemetryEvent('delete', {recordId: id});
        let rtn = await this.domain.remove(id);
        return rtn;
    }

    async getFindQueryParams(req) {
        if (!_.isEmpty(req) && _.isObject(req) && !_.isEmpty(req.query)) {

            if (_.isEmpty(req.query.fields) && _.isEmpty(req.query?.filters)) {
                throw new APIError(400, 'A filter must be provided to get results.');
            }
            else {
                const filters = new Filter(req).getFilters();
                const sorters = new Sort(req).getSort();
                const select = new SelectInclude(req).getSelect();
                const limit = (!_.isEmpty(req.query.limit) && _.isNumber(req.query.limit)) ? req.query.limit : 1000;
                const offset = (!_.isEmpty(req.query.offset) && _.isNumber(req.query.offset)) ? req.query.offset : 0;
                return {
                    filters: filters,
                    sorters: sorters,
                    select: select,
                    limit: limit,
                    offset: offset
                }
            }
        }
        else {
            throw new APIError(400, 'Must have query parameters to execute a search.');
        }
    }

    async find(queryParams) {
        const { filters, sorters, select, limit, offset } = queryParams;
        this.addTelemetryEvent('find', {filters: filters, sorters: sorters, select: select, limit: limit, offset: offset});
        return await this.domain.find(queryParams);
    }

    async count(queryParams) {
        const { filters, sorters, select, limit, offset } = queryParams;
        this.addTelemetryEvent('count', {filters: filters, sorters: sorters, select: select, limit: limit, offset: offset});
        const result = await this.domain.find(queryParams, true);
        return { count: result };
    }

    async distinctList(propName) {
        this.addTelemetryEvent('distinctList', {propName: propName});
        return await this.domain.list().distinct(propName);
    }

    async addFunctionMixin({}, ...mixins) {
        if (!mixins) return;

        for (let mixin of mixins) {
            if (typeof mixin === 'function') {
                Object.getPrototypeOf(this)[mixin.name] = mixin;
            }
        }
    }

    async insertMany(rawObjects =[]) {
        this.addTelemetryEvent('insertMany', {batchCount: rawObjects.length, note: 'putting chunks of records in telemetry will need to be considered.'});
        return await this.domain.insertMany(rawObjects, { ordered: false, populate: null });
    }

    async deleteMany(queryParams) {
        const { filters, sorters, select, limit, offset } = queryParams;

        if (!filters) {
            this.logger.error('Must supply filters to delete many.');
            return undefined;
        }

        this.addTelemetryEvent('deleteMany', {filters: filters, sorters: sorters, select: select, limit: limit, offset: offset});
        return await this.domain.find(queryParams, false, true);
    }

}
