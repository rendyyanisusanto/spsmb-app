export const logAudit = (params) => {
  // In a real app, this would be an API call.
  // For frontend mock, we'll get the current user from localStorage if possible
  const authState = localStorage.getItem('spsmb_auth_state');
  let user = { id: 1, name: 'System', username: 'system', role: 'SUPER_ADMIN', institution: null };
  
  if (authState) {
    const parsed = JSON.parse(authState);
    if (parsed.user) {
      user = parsed.user;
    }
  }

  const logEntry = {
    id: Date.now(),
    userId: user.id,
    userName: user.name,
    username: user.username,
    role: user.role,
    institutionId: user.institution?.id || null,
    institutionName: user.institution?.name || 'Global',
    action: params.action,
    module: params.module,
    targetType: params.targetType,
    targetId: params.targetId,
    targetName: params.targetName,
    description: params.description,
    before: params.before || null,
    after: params.after || null,
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
  };

  const saved = localStorage.getItem('spsmb_audit_logs');
  let allLogs = [];
  if (saved) {
    allLogs = JSON.parse(saved);
  }
  
  // Prepend to array
  allLogs.unshift(logEntry);
  localStorage.setItem('spsmb_audit_logs', JSON.stringify(allLogs));
};
