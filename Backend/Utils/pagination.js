/**
 * Pagination Utilities
 * Provides consistent pagination across all list endpoints
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse pagination parameters from request query
 * @param {Object} query - Express req.query object
 * @returns {Object} { page, limit, skip }
 */
function parsePagination(query) {
  let page = parseInt(query.page, 10) || DEFAULT_PAGE;
  let limit = parseInt(query.limit, 10) || DEFAULT_LIMIT;
  
  // Validate bounds
  page = Math.max(1, page);
  limit = Math.min(Math.max(1, limit), MAX_LIMIT);
  
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

/**
 * Create pagination metadata
 * @param {number} total - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
function createPaginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  };
}

/**
 * Apply pagination to a Mongoose query
 * @param {Object} query - Mongoose query
 * @param {Object} pagination - { page, limit, skip }
 * @returns {Object} Modified query
 */
function applyPagination(query, pagination) {
  const { limit, skip } = pagination;
  return query.skip(skip).limit(limit);
}

/**
 * Execute paginated query with count
 * @param {Object} model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {Object} pagination - { page, limit, skip }
 * @param {Object} options - { sort, populate, select }
 * @returns {Promise<Object>} { data, meta }
 */
async function executePaginatedQuery(model, filter, pagination, options = {}) {
  const { page, limit, skip } = pagination;
  const { sort = { createdAt: -1 }, populate = '', select = '' } = options;
  
  // Execute count and data queries in parallel
  const [total, data] = await Promise.all([
    model.countDocuments(filter),
    model.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate(populate)
      .select(select)
      .lean()
  ]);
  
  const meta = createPaginationMeta(total, page, limit);
  
  return { data, meta };
}

/**
 * Create cursor-based pagination for large datasets
 * @param {Object} query - Express req.query
 * @returns {Object} { cursor, limit, direction }
 */
function parseCursorPagination(query) {
  const cursor = query.cursor || null;
  const limit = Math.min(parseInt(query.limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const direction = query.direction === 'prev' ? 'prev' : 'next';
  
  return { cursor, limit, direction };
}

/**
 * Build cursor query for Mongoose
 * @param {Object} cursorPagination - { cursor, limit, direction }
 * @param {string} sortField - Field to sort by (e.g., 'createdAt')
 * @returns {Object} Mongoose query conditions
 */
function buildCursorQuery(cursorPagination, sortField = 'createdAt') {
  const { cursor, direction } = cursorPagination;
  
  if (!cursor) {
    return {};
  }
  
  const operator = direction === 'next' ? '$lt' : '$gt';
  return { [sortField]: { [operator]: cursor } };
}

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePagination,
  createPaginationMeta,
  applyPagination,
  executePaginatedQuery,
  parseCursorPagination,
  buildCursorQuery
};
