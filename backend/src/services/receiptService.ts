import Receipt from '../models/Receipt.js';
import { ai, GEMINI_MODEL, extractJson, normalizeCategory } from '../utils/gemini.js';
import { saveImage } from './storageService.js';

const today = (): string => new Date().toISOString().split('T')[0];

const RECEIPT_PROMPT = (currentDate: string) => `
Analyze this receipt image. Extract the following information:
1. The merchant or store name (e.g. "Walmart" or "Starbucks").
2. The transaction date in YYYY-MM-DD format (use today's date ${currentDate} if not clearly specified).
3. The total amount of the bill as a number.
4. The general category (choose EXACTLY from: Food, Travel, Shopping, Bills, Education, Entertainment, Healthcare, Investments, Others).
5. A short summary description.
6. A detailed breakdown of individual line items, each with:
   - "item": name of the item
   - "amount": cost of the item as a number
   - "category": choose EXACTLY from: Food, Travel, Shopping, Bills, Education, Entertainment, Healthcare, Investments, Others (use best judgment based on the item)

Respond ONLY with a JSON object of this structure. Do not include markdown formatting or backticks around it:
{
  "merchant": "string",
  "totalAmount": number,
  "date": "YYYY-MM-DD",
  "category": "string",
  "description": "string",
  "lineItems": [
    { "item": "string", "amount": number, "category": "string" }
  ]
}`;

// Ask Gemini (vision) to read the receipt. Throws if AI is unavailable or the
// answer is not usable, so the caller can fall back to manual entry.
async function extractWithGemini(base64Data: string, mimeType: string) {
  if (!ai) throw new Error('Gemini API key is not configured');

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ inlineData: { data: base64Data, mimeType } }, RECEIPT_PROMPT(today())]
  });

  const result = JSON.parse(extractJson(response.text));

  return {
    merchant: String(result.merchant || 'Unknown Merchant'),
    totalAmount: Number(result.totalAmount) || 0,
    date: /^\d{4}-\d{2}-\d{2}$/.test(result.date) ? result.date : today(),
    category: normalizeCategory(result.category),
    description: String(result.description || ''),
    lineItems: (Array.isArray(result.lineItems) ? result.lineItems : []).map((li: any) => ({
      item: li.item || 'Unnamed Item',
      amount: Number(li.amount) || 0,
      category: normalizeCategory(li.category)
    }))
  };
}

// Store the receipt image, try to read it with AI, and save a Receipt record.
// If the AI cannot read it, the image is still kept and the user gets an empty
// form to fill in by hand: we never invent amounts or merchants.
export async function parseReceiptImage(userId: string, image: string, mimeType: string): Promise<any> {
  const base64Data = image.replace(/^data:image\/[\w.+-]+;base64,/, '');
  const stored = await saveImage(base64Data, mimeType);

  try {
    const extracted = await extractWithGemini(base64Data, mimeType);

    const receipt = await Receipt.create({
      userId,
      merchant: extracted.merchant,
      amount: extracted.totalAmount,
      date: extracted.date,
      rawText: extracted.description,
      imageUrl: stored.url,
      imagePublicId: stored.publicId,
      status: 'processed'
    });

    return { id: receipt._id, ...extracted, imageUrl: stored.url };
  } catch (err: any) {
    console.error('Receipt could not be read automatically:', err?.message || err);

    const receipt = await Receipt.create({
      userId,
      merchant: 'Unread receipt',
      date: today(),
      rawText: '',
      imageUrl: stored.url,
      imagePublicId: stored.publicId,
      status: 'failed'
    });

    return {
      id: receipt._id,
      merchant: '',
      totalAmount: 0,
      date: today(),
      category: 'Others',
      description: '',
      lineItems: [],
      imageUrl: stored.url,
      needsManualEntry: true,
      warning: 'We could not read this receipt automatically. The image is saved; please enter the details yourself.'
    };
  }
}
