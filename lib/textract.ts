import {
  AnalyzeDocumentCommand,
  TextractClient,
  type Block,
  type AnalyzeDocumentCommandOutput,
} from '@aws-sdk/client-textract';

export type TextractBoundingBox = {
  Left: number;
  Top: number;
  Width: number;
  Height: number;
};

export type DetectedField = {
  id: string;
  page: number;
  keyText: string;
  confidence: number;
  boundingBox: TextractBoundingBox;
};

export type DetectedSignature = {
  id: string;
  page: number;
  confidence: number;
  boundingBox: TextractBoundingBox;
};

function getClient(): TextractClient {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing AWS credentials or region in environment variables');
  }

  return new TextractClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function analyzeWithTextract(
  pdfBytes: Uint8Array
): Promise<AnalyzeDocumentCommandOutput> {
  const client = getClient();

  const command = new AnalyzeDocumentCommand({
    Document: {
      Bytes: pdfBytes,
    },
    FeatureTypes: ['FORMS', 'SIGNATURES'],
  });

  return await client.send(command);
}

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function buildBlockMap(blocks: Block[]): Map<string, Block> {
  const map = new Map<string, Block>();
  for (const b of blocks) {
    if (b.Id) map.set(b.Id, b);
  }
  return map;
}

function getTextFromBlock(block: Block, blockMap: Map<string, Block>): string {
  const rels = block.Relationships || [];
  const childRel = rels.find((r) => r.Type === 'CHILD');
  if (!childRel?.Ids?.length) return '';

  const parts: string[] = [];
  for (const id of childRel.Ids) {
    const child = blockMap.get(id);
    if (!child) continue;
    if (child.BlockType === 'WORD' && child.Text) parts.push(child.Text);
    if (child.BlockType === 'SELECTION_ELEMENT' && child.SelectionStatus === 'SELECTED') {
      parts.push('X');
    }
  }

  return parts.join(' ').trim();
}

function getValueBlockIdForKeyBlock(block: Block): string | null {
  const rels = block.Relationships || [];
  const valueRel = rels.find((r) => r.Type === 'VALUE');
  const id = valueRel?.Ids?.[0];
  return id || null;
}

export function parseTextractBlocks(blocks: Block[]): {
  fields: DetectedField[];
  signatures: DetectedSignature[];
} {
  const blockMap = buildBlockMap(blocks);

  const fields: DetectedField[] = [];
  const signatures: DetectedSignature[] = [];

  for (const block of blocks) {
    if (block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')) {
      const keyText = getTextFromBlock(block, blockMap);
      const valueId = getValueBlockIdForKeyBlock(block);
      if (!valueId) continue;

      const valueBlock = blockMap.get(valueId);
      const bbox = valueBlock?.Geometry?.BoundingBox;

      if (!keyText || !bbox) continue;

      fields.push({
        id: valueId,
        page: valueBlock?.Page ?? block.Page ?? 1,
        keyText,
        confidence: valueBlock?.Confidence ?? block.Confidence ?? 0,
        boundingBox: {
          Left: bbox.Left ?? 0,
          Top: bbox.Top ?? 0,
          Width: bbox.Width ?? 0,
          Height: bbox.Height ?? 0,
        },
      });
    }

    if (block.BlockType === 'SIGNATURE') {
      const bbox = block.Geometry?.BoundingBox;
      if (!bbox || !block.Id) continue;

      signatures.push({
        id: block.Id,
        page: block.Page ?? 1,
        confidence: block.Confidence ?? 0,
        boundingBox: {
          Left: bbox.Left ?? 0,
          Top: bbox.Top ?? 0,
          Width: bbox.Width ?? 0,
          Height: bbox.Height ?? 0,
        },
      });
    }
  }

  return { fields, signatures };
}

export type CompanyProfileForMapping = any;

export function mapDetectedKeyToProfileValue(
  keyText: string,
  companyProfile: CompanyProfileForMapping
): { fieldKey: string; value: string } | null {
  const k = normalizeKey(keyText);

  const candidates: Array<{ match: (k: string) => boolean; fieldKey: string; get: () => string }> = [
    {
      match: (s) => s.includes('name of bidder') || s === 'bidder' || s.includes('name of tenderer') || s === 'name',
      fieldKey: 'NAME_OF_BIDDER',
      get: () => companyProfile.company?.name ?? '',
    },
    {
      match: (s) => s.includes('postal address') || (s.includes('address') && s.includes('postal')),
      fieldKey: 'POSTAL_ADDRESS',
      get: () =>
        `${companyProfile.company?.address?.street ?? ''}, ${companyProfile.company?.address?.city ?? ''}, ${companyProfile.company?.address?.postalCode ?? ''}`.trim(),
    },
    {
      match: (s) => s.includes('street address') || s.includes('physical address') || (s.includes('address') && s.includes('street')),
      fieldKey: 'STREET_ADDRESS',
      get: () =>
        `${companyProfile.company?.address?.street ?? ''}, ${companyProfile.company?.address?.city ?? ''}`.trim(),
    },
    {
      match: (s) => s.includes('cell') || s.includes('mobile') || s.includes('cell number') || s.includes('contact number'),
      fieldKey: 'CELL_NUMBER',
      get: () => companyProfile.company?.contact?.phone ?? '',
    },
    {
      match: (s) => s.includes('vat') || s.includes('vat reg') || s.includes('vat number') || s.includes('vat no'),
      fieldKey: 'VAT_NUMBER',
      get: () => companyProfile.company?.vatNumber ?? '',
    },
    {
      match: (s) => s.includes('csd') || s.includes('maaa') || s.includes('supplier number') || s.includes('registration number'),
      fieldKey: 'CSD_NUMBER',
      get: () => companyProfile.company?.registrationNumber ?? '',
    },
    {
      match: (s) => s.includes('email'),
      fieldKey: 'EMAIL',
      get: () => companyProfile.company?.contact?.email ?? '',
    },
  ];

  for (const c of candidates) {
    if (!c.match(k)) continue;
    const value = c.get();
    if (!value) return null;
    return { fieldKey: c.fieldKey, value };
  }

  return null;
}
