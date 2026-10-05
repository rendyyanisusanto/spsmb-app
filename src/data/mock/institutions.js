export let mockInstitutions = [
  {
    id: 1,
    code: 'PND-01',
    name: 'Pondok Pesantren Asy-Syadzili',
    institution_type: 'PONDOK',
    gender_scope: 'CAMPURAN',
    is_active: 1,
    created_at: new Date('2023-01-01T08:00:00Z').toISOString(),
    updated_at: new Date('2023-01-01T08:00:00Z').toISOString(),
  },
  {
    id: 2,
    code: 'SMP-01',
    name: 'SMP IT Asy-Syadzili',
    institution_type: 'SMP',
    gender_scope: 'CAMPURAN',
    is_active: 1,
    created_at: new Date('2023-01-01T08:00:00Z').toISOString(),
    updated_at: new Date('2023-01-01T08:00:00Z').toISOString(),
  },
  {
    id: 3,
    code: 'SMA-01',
    name: 'SMA IT Asy-Syadzili',
    institution_type: 'SMA',
    gender_scope: 'CAMPURAN',
    is_active: 1,
    created_at: new Date('2023-01-01T08:00:00Z').toISOString(),
    updated_at: new Date('2023-01-01T08:00:00Z').toISOString(),
  },
  {
    id: 4,
    code: 'SMK-01',
    name: 'SMK IT Asy-Syadzili',
    institution_type: 'SMK',
    gender_scope: 'CAMPURAN',
    is_active: 1,
    created_at: new Date('2023-01-01T08:00:00Z').toISOString(),
    updated_at: new Date('2023-01-01T08:00:00Z').toISOString(),
  }
];

export const getInstitutionsMock = async (params = {}) => {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  let data = [...mockInstitutions];
  
  if (params.search) {
    const q = params.search.toLowerCase();
    data = data.filter(item => 
      item.code.toLowerCase().includes(q) || 
      item.name.toLowerCase().includes(q)
    );
  }
  
  return { success: true, data };
};

export const createInstitutionMock = async (payload) => {
  await new Promise(resolve => setTimeout(resolve, 800));
  const newId = mockInstitutions.length ? Math.max(...mockInstitutions.map(i => i.id)) + 1 : 1;
  const newInstitution = {
    ...payload,
    id: newId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockInstitutions.push(newInstitution);
  return { success: true, data: newInstitution };
};

export const updateInstitutionMock = async (id, payload) => {
  await new Promise(resolve => setTimeout(resolve, 800));
  const idx = mockInstitutions.findIndex(i => i.id === id);
  if (idx === -1) return { success: false, error: 'Data tidak ditemukan' };
  
  mockInstitutions[idx] = {
    ...mockInstitutions[idx],
    ...payload,
    updated_at: new Date().toISOString(),
  };
  return { success: true, data: mockInstitutions[idx] };
};

export const deleteInstitutionMock = async (id) => {
  await new Promise(resolve => setTimeout(resolve, 800));
  const idx = mockInstitutions.findIndex(i => i.id === id);
  if (idx === -1) return { success: false, error: 'Data tidak ditemukan' };
  
  mockInstitutions.splice(idx, 1);
  return { success: true };
};
