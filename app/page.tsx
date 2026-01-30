'use client';

import { useState, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import './pageStyleSheet.css';

export default function Home() {

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textResult, setTextResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);


  useEffect(() => {
    if (!selectedImage) return;
    setPreviewUrl(URL.createObjectURL(selectedImage));
    convertImageToText();
  }, [selectedImage]);

  const handleChangeImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
  };


  const preprocessImage = async (file: File): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);


        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          const avg =
            (imageData.data[i] +
              imageData.data[i + 1] +
              imageData.data[i + 2]) /
            3;
          imageData.data[i] = avg;
          imageData.data[i + 1] = avg;
          imageData.data[i + 2] = avg;
        }

        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      };
    });

  const convertImageToText = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setShowResult(false);
    setTextResult('');

    try {
      const worker = await createWorker('eng');
      const preprocessedUrl = await preprocessImage(selectedImage);
      const { data } = await worker.recognize(preprocessedUrl);

      setTextResult(data.text || '');
      await worker.terminate();
    } catch (err) {
      console.error(err);
      setTextResult('Failed to read image');
    } finally {
      setLoading(false);
    }
  };


  const downloadText = () => {
    if (!textResult) return;

    const blob = new Blob([textResult], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'handwritten_notes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <div className="outer-ring">
      <div className="inner-content">
        <header className="header">
          <h1>Document Reader</h1>
        </header>

        <div className="main-layout">
          <div className="left-column">
            <div className="upload-section">
              <label htmlFor="upload">Upload Image:</label>
              <input
                type="file"
                id="upload"
                accept="image/*"
                onChange={handleChangeImage}
              />
            </div>

            {previewUrl && (
              <img src={previewUrl} alt="preview" className="preview-image" />
            )}

            {loading && <p className="loading">Processing...</p>}
          </div>

          <div className="right-column">
            {showResult && textResult && (
              <div className="ocr-result">
                <pre>{textResult}</pre>
              </div>
            )}

            <div className="buttons-bottom">
              <button onClick={() => setShowResult((p) => !p)}>
                {showResult ? 'Hide OCR Result' : 'Show OCR Result'}
              </button>

              <button className="extract-button" onClick={downloadText}>
                Download Text
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
