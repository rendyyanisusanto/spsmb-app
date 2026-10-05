const INITIAL_APPLICANTS = [
  {
    id: 1,
    registrationNumber: 'SPSMB-2027-00001',
    name: 'Ahmad Fauzan',
    institution: 'SMK IT Asy-Syadzili',
    whatsapp: '081234567890',
    documents: [
      {
        requirementCode: 'family_card',
        status: 'VERIFIED',
        fileName: 'kk_ahmad.pdf',
        fileSize: '1.2 MB',
        fileUrl: '#',
        uploadedAt: '2026-09-28 10:00',
        verifiedAt: '2026-09-29 09:00',
        verifiedBy: 'Admin SMK',
        verificationNote: null
      },
      {
        requirementCode: 'birth_certificate',
        status: 'REVISION',
        fileName: 'akta_buram.jpg',
        fileSize: '2.5 MB',
        fileUrl: '#',
        uploadedAt: '2026-09-28 10:05',
        verifiedAt: '2026-09-29 09:05',
        verifiedBy: 'Admin SMK',
        verificationNote: 'Foto buram, tolong upload yang lebih jelas agar bisa terbaca.'
      },
      {
        requirementCode: 'photo',
        status: 'UPLOADED',
        fileName: 'pasfoto.png',
        fileSize: '1.8 MB',
        fileUrl: '#',
        uploadedAt: '2026-09-30 08:00',
        verifiedAt: null,
        verifiedBy: null,
        verificationNote: null
      }
      // skl_smp NOT_UPLOADED
    ]
  },
  {
    id: 2,
    registrationNumber: 'SPSMB-2027-00002',
    name: 'Budi Santoso',
    institution: 'SMA IT Asy-Syadzili',
    whatsapp: '081234567891',
    documents: []
  },
  {
    id: 3,
    registrationNumber: 'SPSMB-2027-00003',
    name: 'Siti Aminah',
    institution: 'SMP IT Asy-Syadzili',
    whatsapp: '081234567892',
    documents: [
      {
        requirementCode: 'family_card',
        status: 'VERIFIED',
        fileName: 'kk_siti.pdf',
        fileSize: '2.1 MB',
        fileUrl: '#',
        uploadedAt: '2026-09-28 11:00',
        verifiedAt: '2026-09-29 10:00',
        verifiedBy: 'Super Admin',
        verificationNote: null
      },
      {
        requirementCode: 'birth_certificate',
        status: 'VERIFIED',
        fileName: 'akta_siti.pdf',
        fileSize: '1.5 MB',
        fileUrl: '#',
        uploadedAt: '2026-09-28 11:05',
        verifiedAt: '2026-09-29 10:05',
        verifiedBy: 'Super Admin',
        verificationNote: null
      },
      {
        requirementCode: 'photo',
        status: 'VERIFIED',
        fileName: 'foto_siti.jpg',
        fileSize: '0.8 MB',
        fileUrl: '#',
        uploadedAt: '2026-09-28 11:10',
        verifiedAt: '2026-09-29 10:10',
        verifiedBy: 'Super Admin',
        verificationNote: null
      }
    ]
  }
]

export const getApplicantDocumentsMock = async (institutionName = null) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const saved = localStorage.getItem('spsmb_applicant_documents')
      let apps = saved ? JSON.parse(saved) : [...INITIAL_APPLICANTS]
      
      if (institutionName) {
        apps = apps.filter(a => a.institution === institutionName)
      }
      
      resolve({ success: true, data: apps })
    }, 400)
  })
}

export const getApplicantDetailMock = async (id) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const saved = localStorage.getItem('spsmb_applicant_documents')
      let apps = saved ? JSON.parse(saved) : [...INITIAL_APPLICANTS]
      const applicant = apps.find(a => String(a.id) === String(id))
      
      if (applicant) {
        resolve({ success: true, data: applicant })
      } else {
        resolve({ success: false, message: 'Not found' })
      }
    }, 400)
  })
}

export const saveApplicantDocumentsMock = async (applicants) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      localStorage.setItem('spsmb_applicant_documents', JSON.stringify(applicants))
      resolve({ success: true })
    }, 400)
  })
}

export const updateApplicantDocumentStatusMock = async (applicantId, requirementCode, statusData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const saved = localStorage.getItem('spsmb_applicant_documents')
      let apps = saved ? JSON.parse(saved) : [...INITIAL_APPLICANTS]
      
      const appIndex = apps.findIndex(a => String(a.id) === String(applicantId))
      if (appIndex !== -1) {
        const docIndex = apps[appIndex].documents.findIndex(d => d.requirementCode === requirementCode)
        if (docIndex !== -1) {
          apps[appIndex].documents[docIndex] = {
            ...apps[appIndex].documents[docIndex],
            ...statusData
          }
        } else {
          // Document was not uploaded, theoretically we shouldn't be verifying it, but just in case
          apps[appIndex].documents.push({
            requirementCode,
            fileName: '-',
            fileSize: '0',
            uploadedAt: null,
            ...statusData
          })
        }
        localStorage.setItem('spsmb_applicant_documents', JSON.stringify(apps))
        resolve({ success: true, data: apps[appIndex] })
      } else {
        resolve({ success: false, message: 'Applicant not found' })
      }
    }, 400)
  })
}
