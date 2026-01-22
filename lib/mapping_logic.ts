export interface FieldCoordinate {
  x: number;
  y: number;
  page: number;
  fontSize?: number;
  maxWidth?: number;
}

export type FormMapping = Record<string, FieldCoordinate>;

export type KnownFormType = 'SBD1_TOURISM' | 'SABS_RFP' | 'SBD4' | null;

export const documentMaps = {
  "SBD1_TOURISM": {
    "NAME_OF_BIDDER": { page: 0, x: 130, y: 515, fontSize: 10, maxWidth: 250 },
    "POSTAL_ADDRESS": { page: 0, x: 130, y: 495, fontSize: 10, maxWidth: 250 },
    "STREET_ADDRESS": { page: 0, x: 130, y: 460, fontSize: 10, maxWidth: 250 },
    "CELL_NUMBER": { page: 0, x: 130, y: 425, fontSize: 10, maxWidth: 150 },
    "VAT_NUMBER": { page: 0, x: 130, y: 390, fontSize: 10, maxWidth: 150 },
    "CSD_NUMBER": { page: 0, x: 420, y: 355, fontSize: 10, maxWidth: 150 },
    "SIGNATURE": { page: 6, x: 150, y: 120, fontSize: 10 }
  },
  "SABS_RFP": {
    "NAME_OF_BIDDER": { page: 1, x: 230, y: 655, fontSize: 10, maxWidth: 300 },
    "POSTAL_ADDRESS": { page: 1, x: 230, y: 625, fontSize: 10, maxWidth: 300 },
    "STREET_ADDRESS": { page: 1, x: 230, y: 595, fontSize: 10, maxWidth: 300 },
    "VAT_NUMBER": { page: 1, x: 230, y: 480, fontSize: 10, maxWidth: 200 },
    "SIGNATURE": { page: 20, x: 200, y: 150, fontSize: 10 }
  },
  "SBD4": {
    "NAME_OF_BIDDER": { page: 0, x: 130, y: 515, fontSize: 10, maxWidth: 250 },
    "SIGNATURE": { page: 1, x: 150, y: 120, fontSize: 10 }
  }
};

export function detectFormType(pdfText: string): KnownFormType {
  const lowerText = pdfText.toLowerCase();

  console.log('PDF Text Sample (first 500 chars):', pdfText.substring(0, 500));

  // SABS detection
  if (lowerText.includes('sabs') ||
    lowerText.includes('south african bureau of standards') ||
    lowerText.includes('rfp 201891')) {
    console.log('Detected form type: SABS_RFP');
    return 'SABS_RFP';
  }

  // Tourism/SBD1 detection - more flexible
  if (lowerText.includes('tourism') ||
    lowerText.includes('sbd') ||
    lowerText.includes('sbd 1') ||
    lowerText.includes('sbd1') ||
    lowerText.includes('standard bidding document') ||
    lowerText.includes('bidder') ||
    lowerText.includes('tender')) {
    console.log('Detected form type: SBD1_TOURISM');
    return 'SBD1_TOURISM';
  }

  console.log('No form type detected. PDF text:', lowerText.substring(0, 1000));
  return null;
}

export function getFormMapping(formType: KnownFormType): FormMapping | null {
  if (!formType) return null;
  return documentMaps[formType] as FormMapping;
}

export function mapCompanyDataToFields(
  companyProfile: any,
  formType: KnownFormType
): Record<string, string> {
  const data: Record<string, string> = {};

  // Handling both new and old structures for safety during transition
  const basic = companyProfile.companyProfile?.basic || companyProfile.company;
  const contact = companyProfile.companyProfile?.contact || companyProfile.company?.contact;

  data['NAME_OF_BIDDER'] = basic?.legalName || basic?.name || '';

  if (contact?.physicalAddress) {
    data['POSTAL_ADDRESS'] = contact.postalAddress;
    data['STREET_ADDRESS'] = contact.physicalAddress;
  } else if (basic?.address) {
    data['POSTAL_ADDRESS'] = `${basic.address.street}, ${basic.address.city}, ${basic.address.postalCode}`;
    data['STREET_ADDRESS'] = `${basic.address.street}, ${basic.address.city}`;
  }

  data['CELL_NUMBER'] = contact?.cellphone || contact?.telephone || contact?.phone || '';
  data['VAT_NUMBER'] = basic?.vatNumber || '';
  data['CSD_NUMBER'] = basic?.registrationNumber || basic?.csdNumber || '';

  return data;
}
