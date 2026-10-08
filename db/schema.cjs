const {sqliteTable,text,integer,index,uniqueIndex}=require('drizzle-orm/sqlite-core');
exports.orders=sqliteTable('orders',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),requestKey:text('request_key').notNull(),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull(),version:integer('version').notNull().default(1),payload:text('payload').notNull()
},t=>[index('orders_owner_created').on(t.ownerId,t.createdAt),uniqueIndex('orders_owner_request').on(t.ownerId,t.requestKey)]);
exports.catalog=sqliteTable('catalog',{id:integer('id').primaryKey(),version:integer('version').notNull().default(1),payload:text('payload').notNull()});

exports.userStates=sqliteTable('user_states',{ownerId:text('owner_id').primaryKey(),updatedAt:integer('updated_at').notNull(),payload:text('payload').notNull()});
