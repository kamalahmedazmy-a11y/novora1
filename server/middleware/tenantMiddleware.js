import { AsyncLocalStorage } from 'async_hooks';

export const tenantLocalStorage = new AsyncLocalStorage();

export const tenantMiddleware = (req, res, next) => {
    // If user is authenticated, set schoolId in the context
    // Super admins are not scoped to any school
    const schoolId = req.user && req.user.role !== 'super_admin' ? req.user.schoolId : null;

    tenantLocalStorage.run({ schoolId }, () => {
        next();
    });
};

export const tenantPlugin = (schema) => {
    // Only apply to schemas that have a schoolId field
    if (!schema.paths.schoolId) return;

    const applyTenantFilter = function(next) {
        const store = tenantLocalStorage.getStore();
        if (store && store.schoolId) {
            this.where({ schoolId: store.schoolId });
        }
        if (next) next();
    };

    schema.pre('find', applyTenantFilter);
    schema.pre('findOne', applyTenantFilter);
    schema.pre('findOneAndUpdate', applyTenantFilter);
    schema.pre('findOneAndDelete', applyTenantFilter);
    schema.pre('findOneAndReplace', applyTenantFilter);
    schema.pre('countDocuments', applyTenantFilter);
    schema.pre('count', applyTenantFilter);
    schema.pre('updateOne', applyTenantFilter);
    schema.pre('updateMany', applyTenantFilter);
    schema.pre('deleteOne', applyTenantFilter);
    schema.pre('deleteMany', applyTenantFilter);

    schema.pre('save', function(next) {
        const store = tenantLocalStorage.getStore();
        if (store && store.schoolId && !this.schoolId) {
            this.schoolId = store.schoolId;
        }
        next();
    });
};
