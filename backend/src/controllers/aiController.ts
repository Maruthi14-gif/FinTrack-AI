import { Request, Response } from 'express';
import { chatWithAssistant } from '../services/chatService.js';
import { searchExpensesByText } from '../services/queryService.js';
import { getMonthlySummary } from '../services/summaryService.js';
import { parseReceiptImage } from '../services/receiptService.js';

// POST /api/ai/chat - AI Financial Assistant Chat
export const chat = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const reply = await chatWithAssistant(req.user.id, message);
    res.json({ reply });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/ai/query - Natural Language Search to Filter translation
export const query = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text query is required' });

    const result = await searchExpensesByText(req.user.id, text);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/ai/summary - Detailed Monthly Summary & Spending Recommendations
export const summary = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const report = await getMonthlySummary(req.user.id);
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/ai/parse-receipt - AI Multimodal Receipt Scanning
export const parseReceipt = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { image, mimeType } = req.body;
    if (!image || !mimeType) {
      return res.status(400).json({ error: 'Image data and mimeType are required' });
    }

    const result = await parseReceiptImage(req.user.id, image, mimeType);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
