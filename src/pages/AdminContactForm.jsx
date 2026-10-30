import { csvContent } from '../utils/security';
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { 
  ArrowLeft, 
  MessageCircle, 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  Eye, 
  Trash2
} from 'lucide-react';
import '../styles/AdminContactForm.css';
import { useNavigate } from 'react-router-dom';

export default function AdminContactForm() {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const ok = await verifyAdmin();
      if (ok) {
        setVerified(true);
        await loadMessages();
      }
    })();
  }, []);

  useEffect(() => {
    let data = messages;
    if (searchTerm) {
      data = data.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterStatus !== 'all') {
      data = data.filter(m => m.status === filterStatus);
    }
    setFilteredMessages(data);
  }, [messages, searchTerm, filterStatus]);

  const verifyAdmin = async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      navigate('/auth');
      return false;
    }
    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();
    if (profileErr || profile.role !== 'admin') {
      navigate('/');
      return false;
    }
    return true;
  };

  const loadMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error loading messages:', error);
    } else {
      // default status field for filtering
      setMessages(data.map(m => ({ ...m, status: 'new' })));
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    const { error } = await supabase
      .from('contact_messages')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Delete error:', error);
      alert('Failed to delete.');
    } else {
      setMessages(prev => prev.filter(m => m.id !== id));
    }
  };

  const exportToCSV = () => {
    const rows = [
      ['Name', 'Email', 'Phone', 'Message', 'Submitted At'],
      ...filteredMessages.map(m => [
        m.name,
        m.email,
        m.phone || '',
        m.message.replace(/\n/g, ' '),
        new Date(m.created_at).toLocaleString()
      ])
    ];
    const csv = csvContent(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contact_messages_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBack = () => navigate('/admin-landing');

  const handleViewMessage = (message) => {
    // Create a modal or detailed view
    const formattedMessage = `
Name: ${message.name}
Email: ${message.email}
Phone: ${message.phone || 'Not provided'}
Submitted: ${new Date(message.created_at).toLocaleString()}

Message:
${message.message}
    `;
    alert(formattedMessage);
  };

  if (!verified) return null;

  return (
    <div className="admin-contact-container">
      {/* Header */}
      <div className="admin-header">
        <div className="container">
          <button onClick={handleBack} className="back-button">
            <ArrowLeft size={18}/> 
            <span>Dashboard</span>
          </button>
          
          <div className="header-title">
            <MessageCircle size={24}/>
            <h1>Contact Form Messages</h1>
          </div>
          
          <div className="header-actions">
            <button onClick={loadMessages} className="action-button" title="Refresh">
              <RefreshCw size={20}/>
            </button>
            <button onClick={exportToCSV} className="action-button" title="Export to CSV">
              <Download size={20}/>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-content">
        {/* Filters */}
        <div className="filters-section">
          <div className="filters-grid">
            <div className="search-filter-group">
              <div className="search-input-wrapper">
                <Search size={20}/>
                <input
                  type="text"
                  placeholder="Search by name, email, or message content..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={20} style={{ color: '#6b7280' }}/>
                <select 
                  value={filterStatus} 
                  onChange={e => setFilterStatus(e.target.value)} 
                  className="filter-select"
                >
                  <option value="all">All Messages</option>
                  <option value="new">New</option>
                  <option value="responded">Responded</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            
            <div className="results-count">
              Showing {filteredMessages.length} of {messages.length} messages
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="messages-table">
            <thead className="table-header">
              <tr>
                <th>Customer Name</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th>Message</th>
                <th>Date Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {loading ? (
                <tr>
                  <td colSpan="6" className="loading-row">
                    <RefreshCw className="loading-spinner" size={24}/>
                    <div style={{ marginTop: '0.5rem' }}>Loading messages...</div>
                  </td>
                </tr>
              ) : filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    {searchTerm || filterStatus !== 'all' 
                      ? 'No messages match your search criteria' 
                      : 'No contact messages found'}
                  </td>
                </tr>
              ) : (
                filteredMessages.map(msg => (
                  <tr key={msg.id}>
                    <td>{msg.name}</td>
                    <td>
                      <a href={`mailto:${msg.email}`} className="email-cell">
                        {msg.email}
                      </a>
                    </td>
                    <td>{msg.phone || '—'}</td>
                    <td>
                      <div className="message-content message-preview">
                        {msg.message}
                      </div>
                    </td>
                    <td className="date-cell">
                      {new Date(msg.created_at).toLocaleDateString()}<br/>
                      <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          onClick={() => handleViewMessage(msg)} 
                          className="action-btn view-btn"
                          title="View full message"
                        >
                          <Eye size={16}/>
                        </button>
                        <button 
                          onClick={() => handleDelete(msg.id)} 
                          className="action-btn delete-btn"
                          title="Delete message"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}