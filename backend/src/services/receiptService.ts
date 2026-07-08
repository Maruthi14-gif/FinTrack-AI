import fs from 'fs';
import path from 'path';
import Receipt from '../models/Receipt.js';
import { ai, GEMINI_MODEL, extractJson, normalizeCategory } from '../utils/gemini.js';

const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads');

// Persist the uploaded receipt image to disk and return its public URL path.
function saveReceiptImage(base64Data: string, mimeType: string): string {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const fileExt = mimeType.split('/')[1] || 'jpg';
  const filename = `receipt-${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
  return `/uploads/${filename}`;
}

// Remove the physical image file referenced by a receipt (best-effort).
export function deleteReceiptImage(imageUrl?: string): void {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;

  const filename = imageUrl.replace(/^\/uploads\//, '');
  const filepath = path.join(UPLOAD_DIR, filename);
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (fsErr) {
    console.error(`Failed to delete physical receipt image file at ${filepath}:`, fsErr);
  }
}

// Analyze a receipt image with Gemini vision: extract merchant, total, date,
// category, and line items. Saves the Receipt record and returns the payload
// the frontend expects. Falls back to a simulated extraction when offline.
export async function parseReceiptImage(userId: string, image: string, mimeType: string): Promise<any> {
  // Extract the raw base64 string
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const imageUrl = saveReceiptImage(base64Data, mimeType);

  if (!ai) {
    console.warn('Gemini API is not configured. Running offline fallback receipt parser.');

    const newReceipt = new Receipt({
      userId,
      merchant: 'Unprocessed Receipt (Offline Fallback)',
      amount: 1250,
      date: new Date().toISOString().split('T')[0],
      rawText: 'Gemini API not configured.',
      imageUrl,
      status: 'failed'
    });
    await newReceipt.save();

    return {
      id: newReceipt._id,
      merchant: "Sample Store",
      totalAmount: 1250,
      date: new Date().toISOString().split('T')[0],
      category: "Shopping",
      description: "Simulated extraction (Gemini API key missing)",
      lineItems: [
        { item: "Item 1", amount: 800, category: "Shopping" },
        { item: "Item 2", amount: 450, category: "Food" }
      ],
      imageUrl,
      fallback: true
    };
  }

  const prompt = `
Analyze this receipt image. Extract the following information:
1. The merchant or store name (e.g. "Walmart" or "Starbucks").
2. The transaction date in YYYY-MM-DD format (use today's date ${new Date().toISOString().split('T')[0]} if not clearly specified).
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

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        prompt
      ]
    });

    const jsonStr = extractJson(response.text);
    const result = JSON.parse(jsonStr);

    const formattedLineItems = (result.lineItems || []).map((li: any) => ({
      item: li.item || 'Unnamed Item',
      amount: Number(li.amount) || 0,
      category: normalizeCategory(li.category)
    }));

    // Save receipt record in database
    const newReceipt = new Receipt({
      userId,
      merchant: result.merchant || 'Unknown Merchant',
      amount: Number(result.totalAmount) || 0,
      date: result.date || new Date().toISOString().split('T')[0],
      rawText: result.description || jsonStr,
      imageUrl,
      status: 'processed'
    });
    await newReceipt.save();

    return {
      id: newReceipt._id,
      merchant: result.merchant || 'Unknown Merchant',
      totalAmount: Number(result.totalAmount) || 0,
      date: result.date || new Date().toISOString().split('T')[0],
      category: normalizeCategory(result.category),
      description: result.description || '',
      lineItems: formattedLineItems,
      imageUrl
    };
  } catch (apiError: any) {
    console.error('Gemini API receipt parsing error, returning offline fallback:', apiError);

    const newReceipt = new Receipt({
      userId,
      merchant: 'Unprocessed Receipt (Gemini Error Fallback)',
      amount: 1250,
      date: new Date().toISOString().split('T')[0],
      rawText: `Gemini API error: ${apiError.message || apiError}`,
      imageUrl,
      status: 'failed'
    });
    await newReceipt.save();

    return {
      id: newReceipt._id,
      merchant: "Sample Store",
      totalAmount: 1250,
      date: new Date().toISOString().split('T')[0],
      category: "Shopping",
      description: "Simulated extraction (Gemini API quota exhausted)",
      lineItems: [
        { item: "Item 1", amount: 800, category: "Shopping" },
        { item: "Item 2", amount: 450, category: "Food" }
      ],
      imageUrl,
      fallback: true,
      warning: 'Gemini API limit exceeded. Using offline fallback parser.'
    };
  }
}
