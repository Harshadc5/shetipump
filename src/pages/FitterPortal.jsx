import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SignaturePad from '../components/SignaturePad';
import { Camera, Image as ImageIcon, QrCode, X, RefreshCw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Html5QrcodeScanner } from 'html5-qrcode';
import fitterBg from '../assets/solar_pump.png';

const BarcodeScannerModal = ({ onScan, onClose }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 100 } },
      false
    );

    scanner.render((text) => {
      onScan(text);
      scanner.clear();
      onClose();
    }, (err) => {
      // ignore
    });

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onScan, onClose]);

  return (
    <div className="scanner-modal">
      <div className="scanner-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h3>Scan Barcode</h3>
          <button className="btn-text" onClick={onClose}><X /></button>
        </div>
        <div id="reader"></div>
      </div>
    </div>
  );
};

const FitterPortal = () => {
  const navigate = useNavigate();

  // Signature state
  const [signatureData, setSignatureData] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    beneficiaryName: '',
    beneficiaryAddress: '',
    installerName: '',
    installerMobile: '',
    commissioningDate: '',
    controllerId: '',
    pumpId: '',
    controllerVendorName: '',
    perPanelKw: '',
    pumpCapacity: '3HP', // default 3HP, 5HP, 7.5HP
    panelCount: 0,
    motorHead: '30 m', // 30m, 50m, 70m, 100m
    motorCapacity: '3HP', // 3HP, 5HP, 7.5HP
    motorSerialNumber: '',
    motorManufactureName: '',
    vendorRepresentativeName: '',
  });

  // Dynamic Panels State (ALMM Numbers)
  const [panels, setPanels] = useState([]);

  // File Upload States (we will just store file names or URLs for now, 
  // in a real app these go to Supabase Storage)
  const [files, setFiles] = useState({});

  // Scanner State
  const [scannerActive, setScannerActive] = useState(false);
  const [activeScannerTarget, setActiveScannerTarget] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'panelCount') {
      const count = parseInt(value) || 0;
      setPanels(Array(count).fill(''));
    }
  };

  const handlePanelChange = (index, value) => {
    const newPanels = [...panels];
    newPanels[index] = value;
    setPanels(newPanels);
  };

  const handleFileChange = (e, fieldName) => {
    if (e.target.files && e.target.files[0]) {
      setFiles((prev) => ({
        ...prev,
        [fieldName]: e.target.files[0]
      }));
    }
  };

  const openScanner = (target) => {
    setActiveScannerTarget(target);
    setScannerActive(true);
  };

  const handleScan = (text) => {
    if (activeScannerTarget !== null) {
      if (typeof activeScannerTarget === 'number') {
        handlePanelChange(activeScannerTarget, text);
      } else {
        setFormData(prev => ({ ...prev, [activeScannerTarget]: text }));
      }
    }
    setScannerActive(false);
    setActiveScannerTarget(null);
  };

  const renderImagePreview = (fileKey1, fileKey2) => {
    const file = files[fileKey1] || (fileKey2 && files[fileKey2]);
    if (!file) return null;
    
    const clearImage = () => {
      const newFiles = { ...files };
      delete newFiles[fileKey1];
      if (fileKey2) delete newFiles[fileKey2];
      setFiles(newFiles);
    };

    return (
      <div style={{ position: 'relative', marginTop: '10px', display: 'block', border: '3px solid #10b981', borderRadius: '12px', overflow: 'hidden' }}>
        <button 
          type="button"
          onClick={clearImage}
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: '#ef4444',
            color: 'white',
            border: '2px solid white',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            zIndex: 10
          }}
        >
          <X size={18} />
        </button>
        <img 
          src={URL.createObjectURL(file)} 
          alt="Preview" 
          style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '400px', objectFit: 'cover' }} 
        />
        <button 
          type="button"
          onClick={clearImage}
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            background: '#334155',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          <RefreshCw size={14} /> Retake
        </button>
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!signatureData) {
      alert('Please provide a signature.');
      return;
    }
    
    // In a real scenario, we'd upload images to Supabase Storage here and get URLs.
    // For this prototype, we'll save the form data to Supabase DB.
    
    const submissionData = {
      ...formData,
      panels_almm: panels,
      signature: signatureData,
      // store file names just to track them
      files_info: Object.keys(files).map(k => ({ field: k, name: files[k].name }))
    };

    try {
      const { data, error } = await supabase
        .from('installations')
        .insert([submissionData]);

      if (error) throw error;
      
      alert('Form submitted successfully!');
      // Reset form or navigate
      navigate('/admin');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(`Error submitting: ${error.message || error}\n\n(Have you setup the Supabase table and RLS?)`);
    }
  };

  return (
    <div className="fitter-container fitter-bg" style={{ backgroundImage: `url(${fitterBg})` }}>
      <header className="fitter-header">
        <div style={{ flex: 1 }}></div>
        <h2 style={{ flex: 2, textAlign: 'center', margin: 0 }}>Maha Krushi Urja Abhiyan - PM Kusum Yojana</h2>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={() => navigate('/')}>Logout</button>
        </div>
      </header>
      
      {scannerActive && (
        <BarcodeScannerModal onScan={handleScan} onClose={() => setScannerActive(false)} />
      )}

      <main className="form-wrapper">
        <form className="glass-card" onSubmit={handleSubmit}>
          
          <div className="input-group">
            <label>Beneficiary Name</label>
            <input type="text" name="beneficiaryName" value={formData.beneficiaryName} onChange={handleInputChange} required />
          </div>

          <div className="input-group">
            <label>Beneficiary Address</label>
            <textarea name="beneficiaryAddress" value={formData.beneficiaryAddress} onChange={handleInputChange} rows="3" required></textarea>
          </div>

          <div className="input-group">
            <label>Beneficiary Aadhar Card Photo</label>
            <div className="file-scan-row">
              <label className="file-label-btn">
                <Camera size={18} /> Camera
                <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, 'aadharPhoto')} />
              </label>
              <label className="file-label-btn">
                <ImageIcon size={18} /> Gallery
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'aadharPhoto_gal')} />
              </label>
            </div>
            {renderImagePreview('aadharPhoto', 'aadharPhoto_gal')}
          </div>

          <h3>By the Installer</h3>
          <div className="input-group">
            <label>Name of the Technical Person</label>
            <input type="text" name="installerName" value={formData.installerName} onChange={handleInputChange} required />
          </div>
          <div className="input-group">
            <label>Mobile Number</label>
            <input type="tel" name="installerMobile" value={formData.installerMobile} onChange={handleInputChange} required />
          </div>
          <div className="input-group">
            <label>Date of Commissioning</label>
            <input type="date" name="commissioningDate" value={formData.commissioningDate} onChange={handleInputChange} required />
          </div>

          <h3>Pump Details</h3>
          <div className="input-group">
            <label>Controller Id / IMEI No.</label>
            <input type="text" name="controllerId" value={formData.controllerId} onChange={handleInputChange} />
            <div className="file-scan-row">
              <button type="button" className="scan-btn" onClick={() => openScanner('controllerId')}>
                <QrCode size={18} /> Scan Barcode
              </button>
              <label className="file-label-btn">
                <Camera size={18} /> Camera
                <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, 'controllerImeiPhoto')} />
              </label>
              <label className="file-label-btn">
                <ImageIcon size={18} /> Gallery
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'controllerImeiPhoto_gallery')} />
              </label>
            </div>
            {renderImagePreview('controllerImeiPhoto', 'controllerImeiPhoto_gallery')}
          </div>

          <div className="input-group">
            <label>Pump Id</label>
            <input type="text" name="pumpId" value={formData.pumpId} onChange={handleInputChange} />
            <div className="file-scan-row">
              <button type="button" className="scan-btn" onClick={() => openScanner('pumpId')}>
                <QrCode size={18} /> Scan Barcode
              </button>
              <label className="file-label-btn">
                <Camera size={18} /> Camera
                <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, 'pumpIdPhoto')} />
              </label>
              <label className="file-label-btn">
                <ImageIcon size={18} /> Gallery
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'pumpIdPhoto_gal')} />
              </label>
            </div>
            {renderImagePreview('pumpIdPhoto', 'pumpIdPhoto_gal')}
          </div>

          <div className="input-group">
            <label>Controller Vendor Name</label>
            <input type="text" name="controllerVendorName" value={formData.controllerVendorName} onChange={handleInputChange} />
          </div>
          <div className="input-group">
            <label>Select per Panel KW</label>
            <input type="text" name="perPanelKw" value={formData.perPanelKw} onChange={handleInputChange} />
          </div>
          <div className="input-group">
            <label>Select Pump Capacity</label>
            <select name="pumpCapacity" value={formData.pumpCapacity} onChange={handleInputChange}>
              <option value="3HP">3HP</option>
              <option value="5HP">5HP</option>
              <option value="7.5HP">7.5HP</option>
            </select>
          </div>
          
          <div className="input-group">
            <label>Panel No. (Enter number to scan barcodes)</label>
            <input 
              type="number" 
              name="panelCount" 
              min="0" 
              value={formData.panelCount} 
              onChange={handleInputChange} 
              onWheel={(e) => e.target.blur()}
            />
          </div>

          {panels.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4>Panel Details ({panels.length} Panels)</h4>
              {panels.map((panelValue, idx) => (
                <div key={idx} className="panel-box">
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>S.No. {idx + 1}: ALMM Number</label>
                    <input 
                      type="text" 
                      value={panelValue} 
                      onChange={(e) => handlePanelChange(idx, e.target.value)} 
                      placeholder="e.g. ALMM Text or Scan Barcode"
                    />
                    <div className="file-scan-row">
                      <button type="button" className="scan-btn" onClick={() => openScanner(idx)}>
                        <QrCode size={18} /> Scan Barcode
                      </button>
                      <label className="file-label-btn">
                        <Camera size={18} /> Photo
                        <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, `panelPhoto_${idx}`)} />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="input-group">
            <label>Motor MAX. Total Dynamic head</label>
            <select name="motorHead" value={formData.motorHead} onChange={handleInputChange}>
              <option value="30 m">30 m</option>
              <option value="50 m">50 m</option>
              <option value="70 m">70 m</option>
              <option value="100 m">100 m</option>
            </select>
          </div>
          <div className="input-group">
            <label>Motor Capacity (HP/KW)</label>
            <select name="motorCapacity" value={formData.motorCapacity} onChange={handleInputChange}>
              <option value="3HP">3HP</option>
              <option value="5HP">5HP</option>
              <option value="7.5HP">7.5HP</option>
            </select>
          </div>
          <div className="input-group">
            <label>Motor Serial Number</label>
            <input type="text" name="motorSerialNumber" value={formData.motorSerialNumber} onChange={handleInputChange} />
          </div>
          <div className="input-group">
            <label>Motor Manufacture Name</label>
            <input type="text" name="motorManufactureName" value={formData.motorManufactureName} onChange={handleInputChange} />
          </div>

          <h3>Upload Site Photos</h3>
          <div className="input-group">
            <label>1. Photo of setup with beneficiary</label>
            <div className="file-scan-row">
              <label className="file-label-btn">
                <Camera size={18} /> Camera
                <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, 'photoSetup')} />
              </label>
              <label className="file-label-btn">
                <ImageIcon size={18} /> Gallery
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'photoSetup_gal')} />
              </label>
            </div>
            {renderImagePreview('photoSetup', 'photoSetup_gal')}
          </div>
          <div className="input-group">
            <label>2. Beneficiary Land or Landmark (Tree/Home/Well)</label>
            <div className="file-scan-row">
              <label className="file-label-btn">
                <Camera size={18} /> Camera
                <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, 'photoLandmark')} />
              </label>
              <label className="file-label-btn">
                <ImageIcon size={18} /> Gallery
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'photoLandmark_gal')} />
              </label>
            </div>
            {renderImagePreview('photoLandmark', 'photoLandmark_gal')}
          </div>
          <div className="input-group">
            <label>3. Photo with beneficiary and officer</label>
            <div className="file-scan-row">
              <label className="file-label-btn">
                <Camera size={18} /> Camera
                <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, 'photoOfficer')} />
              </label>
              <label className="file-label-btn">
                <ImageIcon size={18} /> Gallery
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'photoOfficer_gal')} />
              </label>
            </div>
            {renderImagePreview('photoOfficer', 'photoOfficer_gal')}
          </div>

          <h3>Authentication</h3>
          <div className="input-group">
            <label>Vendor Representative Name</label>
            <input type="text" name="vendorRepresentativeName" value={formData.vendorRepresentativeName} onChange={handleInputChange} required />
          </div>
          
          <SignaturePad 
            title="Signature of Technical Person" 
            onUpdate={setSignatureData} 
          />

          <button type="submit" className="btn-primary">Submit Installation Form</button>

        </form>
      </main>
    </div>
  );
};

export default FitterPortal;
