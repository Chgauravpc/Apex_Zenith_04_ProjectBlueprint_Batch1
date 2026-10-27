/**
 * Trilingual UI translations for shop-floor machining (English, Hindi, Marathi).
 * Reference: ENGINEERING.md §3 and PRD.md §9.7.
 */

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
];

export const TRANSLATIONS = {
  en: {
    appName: 'Project Blueprint',
    appSubtitle: 'CNC / VMC Shop-Floor Knowledge Transfer',
    // Navigation
    navHome: 'Home',
    navCapture: 'Capture',
    navAsk: 'Ask Experience',
    navGuide: 'Guided Job',
    navMap: '3D Map',
    navHandover: 'Handover',
    navReview: 'Review Queue',
    navDashboard: 'Dashboard',
    // Roles
    roleOld: 'Old Employee',
    roleNew: 'New Employee',
    roleSupervisor: 'Supervisor',
    activeRole: 'Role',
    // Common Actions
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading...',
    retry: 'Retry',
    search: 'Search know-how...',
    record: 'Record Voice',
    stopRecord: 'Stop Recording',
    upload: 'Upload',
    approve: 'Approve',
    edit: 'Edit',
    // Status
    statusVerified: 'Verified',
    statusUnofficial: 'Unofficial Note',
    statusDraft: 'Draft',
    statusAnomaly: 'Anomaly Detected',
    // Errors
    errorGeneric: 'Something went wrong. Please try again.',
    errorNetwork: 'Unable to connect to the Blueprint backend server.',
  },
  hi: {
    appName: 'प्रोजेक्ट ब्लूप्रिंट',
    appSubtitle: 'सीएनसी / वीएमसी मशीनिंग ज्ञान स्थानांतरण',
    // Navigation
    navHome: 'होम',
    navCapture: 'कैप्चर',
    navAsk: 'आस्क एक्सपीरियंस',
    navGuide: 'गाइडेड जॉब',
    navMap: '3D मैप',
    navHandover: 'हैंडओवर',
    navReview: 'समीक्षा कतार',
    navDashboard: 'डैशबोर्ड',
    // Roles
    roleOld: 'अनुभवी कर्मचारी',
    roleNew: 'नया कर्मचारी',
    roleSupervisor: 'सुपरवाइज़र',
    activeRole: 'भूमिका',
    // Common Actions
    save: 'सहेजें',
    cancel: 'रद्द करें',
    loading: 'लोड हो रहा है...',
    retry: 'पुनः प्रयास करें',
    search: 'अनुभव खोजें...',
    record: 'आवाज रिकॉर्ड करें',
    stopRecord: 'रिकॉर्डिंग रोकें',
    upload: 'अपलोड करें',
    approve: 'स्वीकृत करें',
    edit: 'संपादित करें',
    // Status
    statusVerified: 'सत्यापित',
    statusUnofficial: 'अनौपचारिक नोट',
    statusDraft: 'प्रारूप',
    statusAnomaly: 'विसंगति पाई गई',
    // Errors
    errorGeneric: 'कुछ गलत हो गया। कृपया पुन: प्रयास करें।',
    errorNetwork: 'ब्लूप्रिंट बैकएंड सर्वर से कनेक्ट करने में असमर्थ।',
  },
  mr: {
    appName: 'प्रोजेक्ट ब्लूप्रिंट',
    appSubtitle: 'सीएनसी / व्हीएमसी मशिनिंग ज्ञान हस्तांतरण',
    // Navigation
    navHome: 'होम',
    navCapture: 'कॅप्चर',
    navAsk: 'अनुभव विचारा',
    navGuide: 'मार्गदर्शित काम',
    navMap: '3D नकाशा',
    navHandover: 'हँडओव्हर',
    navReview: 'पुनरावलोकन रांग',
    navDashboard: 'डॅशबोर्ड',
    // Roles
    roleOld: 'अनुभवी कर्मचारी',
    roleNew: 'नवीन कर्मचारी',
    roleSupervisor: 'पर्यवेक्षक',
    activeRole: 'भूमिका',
    // Common Actions
    save: 'जतन करा',
    cancel: 'रद्द करा',
    loading: 'लोड होत आहे...',
    retry: 'पुन्हा प्रयत्न करा',
    search: 'अनुभव शोधा...',
    record: 'आवाज रेकॉर्ड करा',
    stopRecord: 'रेकॉर्डिंग थांबवा',
    upload: 'अपलोड करा',
    approve: 'मंजूर करा',
    edit: 'संपादित करा',
    // Status
    statusVerified: 'पडताळलेले',
    statusUnofficial: 'अनौपचारिक टीप',
    statusDraft: 'मसुदा',
    statusAnomaly: 'विसंगती आढळली',
    // Errors
    errorGeneric: 'काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.',
    errorNetwork: 'ब्लूप्रिंट बॅकएंड सर्व्हरशी संपर्क साधता आला नाही.',
  },
};

/**
 * Translate key with language fallback to English.
 * @param {string} key
 * @param {string} [lang='en']
 * @returns {string}
 */
export function t(key, lang = 'en') {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || key;
}

export default t;
