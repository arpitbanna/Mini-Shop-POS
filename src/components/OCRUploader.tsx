'use client';

import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { Camera, Loader2, IndianRupee, Hash, Box, Trash2, PlusCircle, X, AlertTriangle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { parseOCR, ParsedItem } from '@/lib/parseOCR';
import styles from '@/styles/form.module.css';

interface OCRUploaderProps {
  onAddItems: (items: { name: string; buyPrice: string; sellPrice: string; quantity: string }[]) => void;
}

export default function OCRUploader({ onAddItems }: OCRUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectedItems, setDetectedItems] = useState<ParsedItem[]>([]);
  const [rawText, setRawText] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const [confidence, setConfidence] = useState<'high' | 'low'>('high');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── OCR Upload Handler ──
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setProgress(0);
    setDetectedItems([]);
    setRawText('');
    setShowRawText(false);

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        }
      });

      const text = result.data.text;
      setRawText(text);

      if (!text.trim()) {
        toast.error('No text found in the image');
        setLoading(false);
        return;
      }

      console.log('─── RAW OCR TEXT ───\n', text);

      const result2 = parseOCR(text);

      if (result2.items.length === 0) {
        toast.error('Could not auto-detect items. Review raw text below.');
        setShowRawText(true);
      } else {
        toast.success(`Detected ${result2.items.length} item${result2.items.length > 1 ? 's' : ''}`);
        setDetectedItems(result2.items);
        setConfidence(result2.confidence);
      }
    } catch (error) {
      console.error('OCR Error:', error);
      toast.error('Failed to read image. Please try again.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Item Editing ──
  const handleItemChange = (id: string, field: keyof ParsedItem, value: string) => {
    setDetectedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemove = (id: string) => {
    setDetectedItems(prev => prev.filter(item => item.id !== id));
  };

  // ── Add to Stock ──
  const handleAddAll = () => {
    const valid = detectedItems.filter(i => i.name.trim() && Number(i.quantity || 0) > 0);
    if (valid.length === 0) {
      toast.error('No valid items to add. Check names and quantities.');
      return;
    }

    onAddItems(
      valid.map(item => ({
        name: item.name,
        buyPrice: item.buyPrice || '0',
        sellPrice: item.sellPrice || '0',
        quantity: item.quantity || '1',
      }))
    );

    setDetectedItems([]);
    setRawText('');
    setShowRawText(false);
    toast.success(`Added ${valid.length} item${valid.length > 1 ? 's' : ''} to stock`);
  };

  // ── Reset ──
  const handleClear = () => {
    setDetectedItems([]);
    setRawText('');
    setShowRawText(false);
    setConfidence('high');
  };

  return (
    <div
      className={styles.card}
      style={{
        background: 'rgba(16, 185, 129, 0.04)',
        borderColor: 'rgba(16, 185, 129, 0.15)',
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'rgb(52, 211, 153)', marginBottom: '4px' }}>
            Smart OCR Stock Entry
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Upload a bill, receipt, or order screenshot
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(detectedItems.length > 0 || rawText) && (
            <button
              type="button"
              onClick={() => setShowRawText(!showRawText)}
              className={styles.btnSecondary}
              style={{
                padding: '0 12px',
                width: 'auto',
                borderColor: 'rgba(255,255,255,0.15)',
                fontSize: '13px',
              }}
            >
              <FileText size={14} /> {showRawText ? 'Hide' : 'Raw'}
            </button>
          )}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleUpload}
            style={{ display: 'none' }}
            id="ocr-upload"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className={styles.btnSecondary}
            style={{
              width: 'auto',
              padding: '0 16px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'rgb(52, 211, 153)',
              borderColor: 'rgba(16, 185, 129, 0.3)',
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            {loading ? 'Reading...' : 'Upload Bill 📸'}
          </button>
        </div>
      </div>

      {/* ── Loading State ── */}
      {loading && (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <Loader2
            size={28}
            className="animate-spin"
            style={{ margin: '0 auto 12px', color: 'rgb(52, 211, 153)', display: 'block' }}
          />
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: 0 }}>
            Scanning image… {progress}%
          </p>
          <div
            style={{
              marginTop: '12px',
              height: '4px',
              borderRadius: '2px',
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
              maxWidth: '240px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, rgb(16, 185, 129), rgb(52, 211, 153))',
                borderRadius: '2px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Low Confidence Warning ── */}
      {detectedItems.length > 0 && confidence === 'low' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(250, 204, 21, 0.08)',
            border: '1px solid rgba(250, 204, 21, 0.2)',
            fontSize: '0.85rem',
            color: 'rgb(250, 204, 21)',
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>Detected items may be inaccurate. Please review before adding.</span>
        </div>
      )}

      {/* ── Detected Items List ── */}
      {detectedItems.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 500, margin: 0 }}>
              Detected Items
              <span
                style={{
                  marginLeft: '8px',
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '99px',
                  background: 'rgba(52, 211, 153, 0.15)',
                  color: 'rgb(52, 211, 153)',
                }}
              >
                {detectedItems.length}
              </span>
            </h4>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '420px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {detectedItems.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  animation: `fadeInList 0.25s ease ${idx * 0.05}s both`,
                }}
              >
                {/* Name row */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <div className={styles.inputWrapper} style={{ flex: 1 }}>
                    <Box size={14} className={styles.inputIcon} />
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => handleItemChange(item.id, 'name', e.target.value)}
                      className={`${styles.input} ${styles.inputWithIcon}`}
                      placeholder="Item Name"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className={styles.btnSecondary}
                    style={{
                      width: '40px',
                      padding: 0,
                      borderColor: 'rgba(239, 68, 68, 0.25)',
                      color: 'rgb(248, 113, 113)',
                      background: 'rgba(239, 68, 68, 0.06)',
                      flexShrink: 0,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Price / Qty row */}
                <div className={styles.threeColumnGrid}>
                  <div className={styles.inputWrapper}>
                    <IndianRupee size={14} className={styles.inputIcon} />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.buyPrice}
                      onChange={e => handleItemChange(item.id, 'buyPrice', e.target.value)}
                      className={`${styles.input} ${styles.inputWithIcon}`}
                      placeholder="Buy ₹"
                    />
                  </div>
                  <div className={styles.inputWrapper}>
                    <IndianRupee size={14} className={styles.inputIcon} />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.sellPrice}
                      onChange={e => handleItemChange(item.id, 'sellPrice', e.target.value)}
                      className={`${styles.input} ${styles.inputWithIcon}`}
                      placeholder="Sell ₹"
                    />
                  </div>
                  <div className={styles.inputWrapper}>
                    <Hash size={14} className={styles.inputIcon} />
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e => handleItemChange(item.id, 'quantity', e.target.value)}
                      className={`${styles.input} ${styles.inputWithIcon}`}
                      placeholder="Qty"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={handleAddAll}
              className={styles.btnPrimary}
              style={{ flex: 1 }}
            >
              <PlusCircle size={16} /> Add All to Stock
            </button>
            <button
              type="button"
              onClick={handleClear}
              className={styles.btnSecondary}
              style={{ flex: 1 }}
            >
              <X size={16} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Raw Text Fallback / Debug ── */}
      {showRawText && rawText && !loading && (
        <div
          style={{
            borderTop: detectedItems.length > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
            paddingTop: detectedItems.length > 0 ? '16px' : 0,
          }}
        >
          <h4
            style={{
              fontSize: '0.9rem',
              marginBottom: '12px',
              fontWeight: 500,
              color: detectedItems.length === 0 ? 'rgb(248, 113, 113)' : 'rgba(255,255,255,0.7)',
            }}
          >
            {detectedItems.length === 0 ? '⚠️ Parsing Failed — Raw OCR Text' : '📄 Raw OCR Text'}
          </h4>
          {detectedItems.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
              Copy details from below and enter items manually using the form.
            </p>
          )}
          <div
            style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: 'rgba(255,255,255,0.7)',
              whiteSpace: 'pre-wrap',
              maxHeight: '250px',
              overflowY: 'auto',
              lineHeight: 1.6,
              fontFamily: 'monospace',
            }}
          >
            {rawText}
          </div>
          {detectedItems.length === 0 && (
            <button
              type="button"
              onClick={handleClear}
              className={styles.btnSecondary}
              style={{ marginTop: '12px', width: '100%', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              Clear and Try Another
            </button>
          )}
        </div>
      )}

      {/* ── Empty state when no rawText and no items (fresh) ── */}
      {!loading && detectedItems.length === 0 && !rawText && (
        <div
          style={{
            textAlign: 'center',
            padding: '20px 0 8px',
            color: 'rgba(255,255,255,0.35)',
            fontSize: '0.8rem',
          }}
        >
          Supports Blinkit, Zomato, Swiggy, and general receipts
        </div>
      )}
    </div>
  );
}
