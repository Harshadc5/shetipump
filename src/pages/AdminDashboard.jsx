import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Download, Search, Trash2, Edit, Eye, X } from 'lucide-react';
import adminBg from '../assets/solar_pump.png';

// Simple CSV export function
const exportToCSV = (data) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(val => {
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csvString = [headers, ...rows].join('\n');
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

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Modals state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetDeleteIds, setTargetDeleteIds] = useState([]); // can be single or array for bulk

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

  return (
    <div className="admin-container admin-bg" style={{ backgroundImage: `url(${adminBg})` }}>
      <header className="admin-header">
        <div className="logo-section">
          <h2>ShetiPump Admin</h2>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/')}>Logout</button>
      </header>

      <DeleteModal 
        isOpen={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)} 
        onConfirm={executeDelete} 
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
                        <button className="btn-text" title="View"><Eye size={18} /></button>
                        <button className="btn-text" title="Edit"><Edit size={18} /></button>
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
