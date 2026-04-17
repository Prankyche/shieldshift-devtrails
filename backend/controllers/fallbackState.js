const fallback = {
  activePolicies: {},
  claimsByUser: {},
};

const getActivePolicy = (userId) => fallback.activePolicies[userId] || null;

const setActivePolicy = (userId, policy) => {
  fallback.activePolicies[userId] = policy;
  return policy;
};

const getClaims = (userId) => fallback.claimsByUser[userId] || [];

const addClaim = (userId, claim) => {
  fallback.claimsByUser[userId] = fallback.claimsByUser[userId] || [];
  fallback.claimsByUser[userId].unshift(claim);
  return claim;
};

module.exports = {
  getActivePolicy,
  setActivePolicy,
  getClaims,
  addClaim,
};
