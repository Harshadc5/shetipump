import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

  // Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

  // Edit Mode State
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const editId = queryParams.get('edit');
  const [isEditMode, setIsEditMode] = useState(!!editId);

  // Dashboard State
  const [currentView, setCurrentView] = useState('menu'); // 'menu', 'new_form', 'view_list', 'view_detail'
  const [userRecords, setUserRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchUserRecords(user.id);
      }
    };
    fetchUser();
  }, []);

  const fetchUserRecords = async (uid) => {
    try {
      const { data, error } = await supabase.from('installations').select('*').eq('user_id', uid).order('created_at', { ascending: false });
      if (error) throw error;
      setUserRecords(data || []);
    } catch (err) {
      console.error('Error fetching user records', err);
    }
  };

  useEffect(() => {
    if (editId) {
      fetchRecordForEdit(editId);
      setCurrentView('new_form');
    }
  }, [editId]);

  const fetchRecordForEdit = async (id) => {
    try {
      const { data, error } = await supabase.from('installations').select('*').eq('id', id).single();
      if (error) throw error;

      setFormData({
        beneficiaryName: data.beneficiaryname || '',
        beneficiaryAddress: data.beneficiaryaddress || '',
        installerName: data.installername || '',
        installerMobile: data.installermobile || '',
        commissioningDate: data.commissioningdate || '',
        controllerId: data.controllerid || '',
        pumpId: data.pumpid || '',
        controllerVendorName: data.controllervendorname || '',
        perPanelKw: data.perpanelkw || '',
        pumpCapacity: data.pumpcapacity || '',
        panelCount: data.panelcount || '',
        motorHead: data.motorhead || '',
        motorCapacity: data.motorcapacity || '',
        motorSerialNumber: data.motorserialnumber || '',
        motorManufactureName: data.motormanufacturename || '',
        vendorRepresentativeName: data.vendorrepresentativename || ''
      });

      if (data.panels_almm && Array.isArray(data.panels_almm)) {
        setPanels(data.panels_almm);
      }

      if (data.signature) {
        setSignatureData(data.signature);
      }

    } catch (error) {
      console.error('Error fetching record for edit:', error);
      alert('Failed to load record for editing.');
    }
  };

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

    setIsSubmitting(true);
    setSubmitStatus('Uploading photos...');

    try {
      // 1. Upload all NEW files to Supabase Storage and get public URLs
      const uploadedFilesInfo = [];
      const fileKeys = Object.keys(files);

      for (let i = 0; i < fileKeys.length; i++) {
        const fileKey = fileKeys[i];
        const file = files[fileKey];

        setSubmitStatus(`Uploading photo ${i + 1} of ${fileKeys.length}...`);

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${fileKey}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('installation_photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('installation_photos')
          .getPublicUrl(fileName);

        uploadedFilesInfo.push({
          field: fileKey,
          name: file.name,
          url: publicUrl
        });
      }

      setSubmitStatus('Saving database record...');

      const submissionData = {
        ...formData,
        panels_almm: panels,
        signature: signatureData
      };

      // In edit mode, we only update files_info if they uploaded NEW files
      // Otherwise, we leave the existing photos alone to prevent deleting them.
      if (!isEditMode || uploadedFilesInfo.length > 0) {
        // If edit mode and uploaded files > 0, ideally we'd merge with existing, 
        // but for this prototype we will just replace the files_info array if they upload new ones.
        submissionData.files_info = uploadedFilesInfo;
      }

      // PostgreSQL automatically lowercases all unquoted column names when creating tables.
      // So beneficiaryName in SQL became beneficiaryname in the database.
      // We must lowercase all keys in our JS object before sending it to Supabase.
      const dbPayload = {};
      for (const key in submissionData) {
        // Convert camelCase to completely lowercase to match Postgres schema
        let value = submissionData[key];

        // Explicit casts for Postgres types
        if (key === 'panelCount') value = parseInt(value, 10) || 0;
        if (key === 'commissioningDate' && !value) value = null; // empty string fails date cast

        dbPayload[key.toLowerCase()] = value;
      }

      if (userId && !isEditMode) {
        dbPayload.user_id = userId;
      }

      let error;
      if (isEditMode) {
        const res = await supabase.from('installations').update(dbPayload).eq('id', editId);
        error = res.error;
      } else {
        const res = await supabase.from('installations').insert([dbPayload]);
        error = res.error;
      }

      if (error) throw error;

      setIsSubmitting(false);
      alert(`Form ${isEditMode ? 'updated' : 'submitted'} successfully!`);

      if (isEditMode) {
        navigate('/admin');
      } else {
        window.location.reload();
      }
    } catch (error) {
      setIsSubmitting(false);
      setSubmitStatus('');
      console.error('Error submitting form:', error);
      alert(`Error submitting: ${error.message || error}\n\n(Have you setup the Supabase table and RLS?)`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const renderMenu = () => (
    <div className="admin-main">
      <div className="glass-card" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
        <h2>Welcome to Fitter Portal</h2>
        <p style={{ marginBottom: '30px', color: 'var(--text-muted)' }}>What would you like to do today?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <button className="btn-primary" style={{ padding: '15px', fontSize: '18px' }} onClick={() => setCurrentView('new_form')}>
            + New Installation Form
          </button>
          <button className="btn-secondary" style={{ padding: '15px', fontSize: '18px' }} onClick={() => setCurrentView('view_list')}>
            <ImageIcon size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }} /> View Uploaded Forms
          </button>
        </div>
      </div>
    </div>
  );

  const renderList = () => (
    <div className="admin-main">
      <div className="glass-card" style={{ maxWidth: '900px', margin: '40px auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Your Uploaded Forms</h3>
          <button className="btn-secondary" onClick={() => setCurrentView('menu')}>Back to Menu</button>
        </div>
        {userRecords.length === 0 ? (
          <p>No forms uploaded yet.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Beneficiary Name</th>
                  <th>Controller ID</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userRecords.map(record => (
                  <tr key={record.id}>
                    <td>{record.beneficiaryname}</td>
                    <td>{record.controllerid}</td>
                    <td>{new Date(record.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="btn-secondary" style={{ padding: '5px 10px' }} onClick={() => {
                        setSelectedRecord(record);
                        setCurrentView('view_detail');
                      }}>View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderDetail = () => {
    if (!selectedRecord) return null;
    return (
      <div className="admin-main">
        <div className="glass-card" style={{ maxWidth: '900px', margin: '40px auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>Form Details</h3>
            <button className="btn-secondary" onClick={() => setCurrentView('view_list')}>Back to List</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div><strong>Beneficiary Name:</strong> {selectedRecord.beneficiaryname}</div>
            <div><strong>Address:</strong> {selectedRecord.beneficiaryaddress}</div>
            <div><strong>Controller ID:</strong> {selectedRecord.controllerid}</div>
            <div><strong>Pump ID:</strong> {selectedRecord.pumpid}</div>
            <div><strong>Pump Capacity:</strong> {selectedRecord.pumpcapacity}</div>
            <div><strong>Commissioning Date:</strong> {selectedRecord.commissioningdate}</div>
          </div>
          {selectedRecord.files_info && selectedRecord.files_info.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4>Uploaded Photos</h4>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {selectedRecord.files_info.map((f, idx) => (
                  <div key={idx}>
                    <p style={{ fontSize: '12px', color: 'gray' }}>{f.name}</p>
                    <img src={f.url} alt={f.name} style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '8px' }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderForm = () => (
    <>
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
            <label>Date of Installation</label>
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
                        <Camera size={18} /> Camera
                        <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, `panelPhoto_${idx}`)} />
                      </label>
                      <label className="file-label-btn">
                        <ImageIcon size={18} /> Gallery
                        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, `panelPhoto_gal_${idx}`)} />
                      </label>
                    </div>
                    {renderImagePreview(`panelPhoto_${idx}`, `panelPhoto_gal_${idx}`)}
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
            <label>2. Beneficiary Water Pump Photo</label>
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

          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }} disabled={isSubmitting}>
            {isSubmitting ? submitStatus : (isEditMode ? 'Update Installation Record' : 'Submit Installation Form')}
          </button>

        </form>
      </main>
    </>
  );

  return (
    <div className="fitter-container fitter-bg" style={{ backgroundImage: `url(${fitterBg})` }}>
      <header className="fitter-header">
        <div style={{ flex: 1 }}>
          {isEditMode && (
            <button className="btn-secondary" onClick={() => navigate('/admin')}>&larr; Back</button>
          )}
          {!isEditMode && currentView !== 'menu' && (
            <button className="btn-secondary" onClick={() => setCurrentView('menu')}>&larr; Menu</button>
          )}
        </div>
        <h2 style={{ flex: 2, textAlign: 'center', margin: 0 }}>Maha Krushi Urja Abhiyan - PM Kusum Yojana</h2>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {currentView === 'menu' && renderMenu()}
      {currentView === 'new_form' && renderForm()}
      {currentView === 'view_list' && renderList()}
      {currentView === 'view_detail' && renderDetail()}
    </div>
  );
};

export default FitterPortal;
