import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Download, Search, Trash2, Edit, Eye, X } from 'lucide-react';
import adminBg from '../assets/solar_pump.png';

// Advanced CSV export function that flattens nested arrays/objects
const exportToCSV = (data) => {
  if (data.length === 0) return;

  const flattenedData = data.map(row => {
    const flatRow = { ...row };
    
    // Flatten panels array
    if (Array.isArray(row.panels_almm)) {
      row.panels_almm.forEach((panel, idx) => {
        flatRow[`Panel_${idx + 1}_ALMM`] = panel;
      });
    }
    delete flatRow.panels_almm;

    // Handle uploaded files and consolidate fields
    let photoMap = {};
    if (Array.isArray(row.files_info)) {
      row.files_info.forEach(fileObj => {
        photoMap[fileObj.field] = fileObj.url || fileObj.name;
      });
    }
    delete flatRow.files_info;

    // Consolidate Controller ID
    if (!flatRow.controllerId) {
      flatRow.controllerId = photoMap['controllerImeiPhoto'] || photoMap['controllerImeiPhoto_gallery'] || '';
    }
    delete photoMap['controllerImeiPhoto'];
    delete photoMap['controllerImeiPhoto_gallery'];

    // Consolidate Pump ID
    if (!flatRow.pumpId) {
      flatRow.pumpId = photoMap['pumpIdPhoto'] || photoMap['pumpIdPhoto_gal'] || '';
    }
    delete photoMap['pumpIdPhoto'];
    delete photoMap['pumpIdPhoto_gal'];

    // Add remaining photos as their own columns
    Object.keys(photoMap).forEach(field => {
      flatRow[`Photo_${field}`] = photoMap[field];
    });

    return flatRow;
  });

  // Collect all unique headers across all rows
  const allHeaders = new Set();
  flattenedData.forEach(row => {
    Object.keys(row).forEach(key => allHeaders.add(key));
  });
  const headers = Array.from(allHeaders);

  const rows = flattenedData.map(row => 
    headers.map(header => {
      const val = row[header] ?? '';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );

  const csvString = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "sheti_pump_records.csv");
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const DeleteModal = ({ isOpen, onClose, onConfirm }) => {
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === 'MITALI@Delete99') {
      onConfirm();
      setPassword('');
    } else {
      alert('Incorrect master password!');
    }
  };

  return (
    <div className="scanner-modal">
      <div className="scanner-content" style={{ maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3>Master Deletion Auth</h3>
          <button className="btn-text" onClick={onClose}><X /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Enter Master Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
          </div>
          <button type="submit" className="btn-danger" style={{ width: '100%' }}>Confirm Deletion</button>
        </form>
      </div>
    </div>
  );
};

const ViewModal = ({ isOpen, onClose, record }) => {
  if (!isOpen || !record) return null;

  return (
    <div className="scanner-modal" style={{ zIndex: 1000 }}>
      <div className="scanner-content" style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <h3>Installation Details</h3>
          <button className="btn-text" onClick={onClose}><X /></button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div><strong>Beneficiary Name:</strong> {record.beneficiaryName}</div>
          <div><strong>Address:</strong> {record.beneficiaryAddress}</div>
          <div><strong>Installer Name:</strong> {record.installerName}</div>
          <div><strong>Installer Mobile:</strong> {record.installerMobile}</div>
          <div><strong>Commissioning Date:</strong> {record.commissioningDate}</div>
          <div><strong>Controller ID:</strong> {record.controllerId}</div>
          <div><strong>Pump ID:</strong> {record.pumpId}</div>
          <div><strong>Vendor Name:</strong> {record.controllerVendorName}</div>
          <div><strong>Pump Capacity:</strong> {record.pumpCapacity}</div>
          <div><strong>Panel Count:</strong> {record.panelCount}</div>
        </div>

        {Array.isArray(record.panels_almm) && record.panels_almm.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4>Panels ALMM</h4>
            <ul>
              {record.panels_almm.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}

        {Array.isArray(record.files_info) && record.files_info.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4>Uploaded Photos</h4>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              {record.files_info.map((file, i) => (
                <div key={i} style={{ border: '1px solid #e2e8f0', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                  <img src={file.url || ''} alt={file.field} style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '4px', marginBottom: '0.5rem', display: 'block' }} />
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{file.field}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Modals state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetDeleteIds, setTargetDeleteIds] = useState([]);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase.from('installations').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
      const mappedData = (data || []).map(row => ({
        id: row.id,
        created_at: row.created_at,
        beneficiaryName: row.beneficiaryname,
        beneficiaryAddress: row.beneficiaryaddress,
        installerName: row.installername,
        installerMobile: row.installermobile,
        commissioningDate: row.commissioningdate,
        controllerId: row.controllerid,
        pumpId: row.pumpid,
        controllerVendorName: row.controllervendorname,
        perPanelKw: row.perpanelkw,
        pumpCapacity: row.pumpcapacity,
        panelCount: row.panelcount,
        motorHead: row.motorhead,
        motorCapacity: row.motorcapacity,
        motorSerialNumber: row.motorserialnumber,
        motorManufactureName: row.motormanufacturename,
        panels_almm: row.panels_almm,
        files_info: row.files_info,
        signature: row.signature,
        vendorRepresentativeName: row.vendorrepresentativename
      }));

      setRecords(mappedData);
    } catch (error) {
      console.error('Error fetching records:', error);
      // Fallback data if table not yet created
    }
  };

  const handleSearch = (e) => setSearch(e.target.value);

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredRecords.map(r => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const initiateDelete = (ids) => {
    setTargetDeleteIds(Array.isArray(ids) ? ids : [ids]);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    try {
      const { error } = await supabase.from('installations').delete().in('id', targetDeleteIds);
      if (error) throw error;
      
      setRecords(prev => prev.filter(r => !targetDeleteIds.includes(r.id)));
      setSelectedIds(new Set([...selectedIds].filter(id => !targetDeleteIds.includes(id))));
      setDeleteModalOpen(false);
      alert('Records deleted successfully.');
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete.');
    }
  };

  const filteredRecords = records.filter(r => 
    r.beneficiaryName?.toLowerCase().includes(search.toLowerCase()) || 
    r.controllerId?.toLowerCase().includes(search.toLowerCase())
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="admin-container admin-bg" style={{ backgroundImage: `url(${adminBg})` }}>
      <header className="admin-header">
        <div className="logo-section">
          <h2>ShetiPump Admin</h2>
        </div>
        <button className="btn-secondary" onClick={handleLogout}>Logout</button>
      </header>

      <DeleteModal 
        isOpen={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)} 
        onConfirm={executeDelete} 
      />

      <ViewModal 
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        record={selectedRecord}
      />

      <main className="admin-main">
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h3>Consumer Records</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '10px', top: '12px', color: 'gray' }} />
                <input 
                  type="text" 
                  placeholder="Search consumer..." 
                  value={search}
                  onChange={handleSearch}
                  style={{ paddingLeft: '35px', width: '250px' }}
                />
              </div>
              <button className="btn-secondary" onClick={() => exportToCSV(filteredRecords)}>
                <Download size={18} /> Export
              </button>
              {selectedIds.size > 0 && (
                <button className="btn-danger" onClick={() => initiateDelete(Array.from(selectedIds))}>
                  <Trash2 size={18} /> Bulk Delete ({selectedIds.size})
                </button>
              )}
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>
                    <input 
                      type="checkbox" 
                      onChange={toggleSelectAll} 
                      checked={filteredRecords.length > 0 && selectedIds.size === filteredRecords.length}
                    />
                  </th>
                  <th>Beneficiary Name</th>
                  <th>Controller ID</th>
                  <th>Pump Capacity</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(record => (
                  <tr key={record.id}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(record.id)} 
                        onChange={() => toggleSelect(record.id)} 
                      />
                    </td>
                    <td>{record.beneficiaryName || 'N/A'}</td>
                    <td>{record.controllerId || 'N/A'}</td>
                    <td>{record.pumpCapacity || 'N/A'}</td>
                    <td>{record.commissioningDate || 'N/A'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-text" title="View" onClick={() => { setSelectedRecord(record); setViewModalOpen(true); }}><Eye size={18} /></button>
                        <button className="btn-text" title="Edit" onClick={() => navigate(`/fitter?edit=${record.id}`)}><Edit size={18} /></button>
                        <button className="btn-text" title="Delete" onClick={() => initiateDelete(record.id)} style={{ color: 'var(--danger)' }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
