'use strict'

const { Domain } = require('../../core');
const mongoose = global.mongoosePool;

const schema = mongoose.Schema(
    {
        enabled: {
            type: Boolean,
            default: true
        },
        route_method: {
            type: String,
            required: true,
            index: true,
            trim: true
        },
        route_path: {
            type: String,
            required: true,
            index: true,
            trim: true
        },
        role_names: {
            type: Array,
            required: true
        },
        created_user: {
            type: String,
            default: 'SYSTEM',
            required: true,
            immutable: true,
            minlength: 3,
            maxlength: 50,
            trim: true
        },
        updated_user: {
            type: String,
            default: 'SYSTEM',
            required: true,
            minlength: 3,
            maxlength: 50,
            trim: true
        }
    },
    {
    timestamps: {
        createdAt: 'create_timestamp',
        updatedAt: 'updated_timestamp'
     }
});

module.exports = class RouteRolesDomain extends Domain {

    constructor() {
        super(mongoose.model('RouteRoles', schema, 'security.routeRoles'));
    }

    list() {
        return this.getDomain().find().sort('name').select('-__v');
    }

}
