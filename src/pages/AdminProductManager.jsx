import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, Trash2, PlusCircle, Save, X, AlertCircle, CheckCircle, HelpCircle, Upload, ImageIcon, Search, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminProductManager.css';

export default function AdminProductManager() {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({});
    const [isNew, setIsNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState('');
    const [showHelp, setShowHelp] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const fileInputRef = useRef(null);
    const modalRef = useRef(null);
    const navigate = useNavigate();

    // Fetch products on mount
    useEffect(() => {
        fetchProducts();
    }, []);

    // Filter products based on search
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredProducts(products);
        } else {
            const filtered = products.filter(product =>
                product.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.product_sub_description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredProducts(filtered);
        }
    }, [searchTerm, products]);

    // Check admin on mount
    useEffect(() => {
        checkAdmin();
    }, []);

    // Close modal on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && (editingProduct !== null || isNew)) {
                handleCloseModal();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [editingProduct, isNew]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (editingProduct !== null || isNew) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [editingProduct, isNew]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (!error) {
                setProducts(data || []);
                setFilteredProducts(data || []);
            } else {
                setErrors({ fetch: 'Failed to load products. Please refresh the page.' });
            }
        } catch (err) {
            setErrors({ fetch: 'Network error. Please check your connection.' });
        }
        setLoading(false);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchProducts();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.product_name?.trim()) {
            newErrors.product_name = 'Product name is required';
        }
        
        if (!formData.product_price || isNaN(formData.product_price) || parseFloat(formData.product_price) <= 0) {
            newErrors.product_price = 'Valid price is required (must be greater than 0)';
        }
        
        if (formData.product_discount) {
            const discount = parseFloat(formData.product_discount);
            if (isNaN(discount) || discount < 0 || discount > 100) {
                newErrors.product_discount = 'Discount must be between 0-100%';
            }
        }
        
        if (!formData.product_sub_description?.trim()) {
            newErrors.product_sub_description = 'Short description is required';
        }
        
        if (!formData.product_description?.trim()) {
            newErrors.product_description = 'Full description is required';
        }
        
        if (formData.size && formData.size.includes(',,')) {
            newErrors.size = 'Remove extra commas between size variants';
        }
        
        if (formData.ingredients_name && formData.percentage) {
            const ingredients = formData.ingredients_name.split(',').filter(i => i.trim());
            const percentages = formData.percentage.split(',').filter(p => p.trim());
            if (ingredients.length !== percentages.length) {
                newErrors.ingredients_percentage = 'Number of ingredients must match number of percentages';
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const checkAdmin = async () => {
        try {
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

            if (profileErr || profile?.role !== 'admin') {
                navigate('/');
                return false;
            }
            return true;
        } catch (error) {
            navigate('/auth');
            return false;
        }
    };

    // Image upload functions
    const uploadImageToSupabase = async (file) => {
        try {
            const fileExt = file.name.split('.').pop().toLowerCase();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
            
            const { data, error } = await supabase.storage
                .from('product-image')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('product-image')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    };

    const handleImageUpload = async (files) => {
        if (!files || files.length === 0) return;

        setUploadingImages(true);
        setErrors(prev => ({ ...prev, imageUpload: undefined }));

        try {
            const validFiles = Array.from(files).filter(file => {
                if (!file.type.startsWith('image/')) {
                    setErrors(prev => ({ 
                        ...prev, 
                        imageUpload: `${file.name} is not a valid image file` 
                    }));
                    return false;
                }
                if (file.size > 5 * 1024 * 1024) {
                    setErrors(prev => ({ 
                        ...prev, 
                        imageUpload: `${file.name} is too large. Maximum size is 5MB` 
                    }));
                    return false;
                }
                return true;
            });

            if (validFiles.length === 0) {
                setUploadingImages(false);
                return;
            }

            const uploadPromises = validFiles.map(file => uploadImageToSupabase(file));
            const uploadedUrls = await Promise.all(uploadPromises);
            
            const currentImages = formData.product_image 
                ? formData.product_image.split(',').map(img => img.trim()).filter(Boolean) 
                : [];
            const allImages = [...currentImages, ...uploadedUrls];
            
            setFormData(prev => ({
                ...prev,
                product_image: allImages.join(',')
            }));

            setSuccess(`Successfully uploaded ${uploadedUrls.length} image(s)!`);
            setTimeout(() => setSuccess(''), 3000);

        } catch (error) {
            setErrors(prev => ({ 
                ...prev, 
                imageUpload: error.message || 'Failed to upload images' 
            }));
        } finally {
            setUploadingImages(false);
        }
    };

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageUpload(e.dataTransfer.files);
        }
    }, [formData.product_image]);

    const removeImage = (indexToRemove) => {
        const currentImages = formData.product_image 
            ? formData.product_image.split(',').map(img => img.trim()).filter(Boolean) 
            : [];
        const updatedImages = currentImages.filter((_, index) => index !== indexToRemove);
        setFormData(prev => ({
            ...prev,
            product_image: updatedImages.join(',')
        }));
    };

    const handleEdit = (product) => {
        setEditingProduct(product.id);
        setFormData({ ...product });
        setIsNew(false);
        setErrors({});
        setSuccess('');
    };

    const handleDelete = async (id) => {
        const product = products.find(p => p.id === id);
        if (window.confirm(`Are you sure you want to delete "${product?.product_name}"?\n\nThis action cannot be undone.`)) {
            setLoading(true);
            try {
                const { error } = await supabase.from('products').delete().eq('id', id);
                if (!error) {
                    setSuccess('Product deleted successfully!');
                    setTimeout(() => setSuccess(''), 3000);
                    fetchProducts();
                } else {
                    setErrors({ delete: 'Delete failed: ' + error.message });
                }
            } catch (err) {
                setErrors({ delete: 'Network error during deletion.' });
            }
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const prepareDataForSave = () => {
        return {
            product_name: formData.product_name?.trim() || '',
            product_price: parseFloat(formData.product_price) || 0,
            product_discount: formData.product_discount ? parseFloat(formData.product_discount) : null,
            product_sub_description: formData.product_sub_description?.trim() || '',
            product_description: formData.product_description?.trim() || '',
            size: formData.size?.split(',').map(s => s.trim()).filter(s => s).join(',') || null,
            key_benefits: formData.key_benefits?.split(',').map(b => b.trim()).filter(b => b).join(',') || null,
            ingredients_name: formData.ingredients_name?.split(',').map(i => i.trim()).filter(i => i).join(',') || null,
            percentage: formData.percentage?.split(',').map(p => p.trim()).filter(p => p).join(',') || null,
            product_image: formData.product_image?.split(',').map(img => img.trim()).filter(img => img).join(',') || null,
            why_choose_product: formData.why_choose_product?.trim() || null,
            ingredients_heading: formData.ingredients_heading?.trim() || null,
            ingredients_description: formData.ingredients_description?.trim() || null,
            ingredients_subheading: formData.ingredients_subheading?.trim() || null,
            how_to_use_heading: formData.how_to_use_heading?.trim() || null,
            how_to_use_description: formData.how_to_use_description?.trim() || null,
            pro_tips: formData.pro_tips?.trim() || null,
        };
    };

    const handleUpdate = async () => {
        if (!validateForm()) return;
        
        setLoading(true);
        try {
            const updateData = prepareDataForSave();
            const { error } = await supabase
                .from('products')
                .update(updateData)
                .eq('id', editingProduct);
            
            if (!error) {
                setEditingProduct(null);
                setSuccess('Product updated successfully!');
                setTimeout(() => setSuccess(''), 3000);
                fetchProducts();
            } else {
                setErrors({ update: 'Update failed: ' + error.message });
            }
        } catch (err) {
            setErrors({ update: 'Network error during update.' });
        }
        setLoading(false);
    };

    const handleAddNew = () => {
        setEditingProduct(null);
        setFormData({
            product_name: '',
            product_price: '',
            product_discount: '',
            product_sub_description: '',
            product_description: '',
            size: '',
            product_image: '',
            key_benefits: '',
            ingredients_name: '',
            percentage: '',
            why_choose_product: '',
            ingredients_heading: '',
            ingredients_description: '',
            ingredients_subheading: '',
            how_to_use_heading: '',
            how_to_use_description: '',
            pro_tips: '',
        });
        setIsNew(true);
        setErrors({});
        setSuccess('');
    };

    const handleCreate = async () => {
        if (!validateForm()) return;
        
        setLoading(true);
        try {
            const createData = prepareDataForSave();
            const { error } = await supabase.from('products').insert([createData]);
            
            if (!error) {
                setIsNew(false);
                setSuccess('Product created successfully!');
                setTimeout(() => setSuccess(''), 3000);
                fetchProducts();
            } else {
                setErrors({ create: 'Creation failed: ' + error.message });
            }
        } catch (err) {
            setErrors({ create: 'Network error during creation.' });
        }
        setLoading(false);
    };

    const handleCloseModal = () => {
        if (Object.keys(formData).some(key => formData[key] && formData[key] !== '')) {
            if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                setEditingProduct(null);
                setIsNew(false);
                setErrors({});
            }
        } else {
            setEditingProduct(null);
            setIsNew(false);
            setErrors({});
        }
    };

    const calculateDiscountedPrice = (price, discount) => {
        if (!discount) return price;
        return price - (price * discount / 100);
    };

    const handleModalBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            handleCloseModal();
        }
    };

    const renderProductCard = (product) => {
        let imageUrl = '';
        if (product.product_image) {
            const imgs = Array.isArray(product.product_image)
                ? product.product_image
                : product.product_image.split(',').map(img => img.trim()).filter(Boolean);
            imageUrl = imgs[0] || '';
        }

        return (
            <div key={product.id} className="apm-product-card">
                <div className="apm-card-header">
                    <div className="apm-product-image-wrapper">
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={product.product_name}
                                className="apm-product-image"
                                onError={(e) => { 
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div className="apm-image-placeholder" style={{ display: imageUrl ? 'none' : 'flex' }}>
                            <ImageIcon size={32} />
                            <span>No Image</span>
                        </div>
                    </div>
                    <div className="apm-card-content">
                        <h3 className="apm-product-title">{product.product_name}</h3>
                        <div className="apm-price-section">
                            <span className="apm-current-price">
                                ₹{calculateDiscountedPrice(product.product_price, product.product_discount).toFixed(2)}
                            </span>
                            {product.product_discount > 0 && (
                                <>
                                    <span className="apm-original-price">₹{product.product_price}</span>
                                    <span className="apm-discount-badge">{product.product_discount}% OFF</span>
                                </>
                            )}
                        </div>
                        <div className="apm-meta-info">
                            {product.size && (
                                <span className="apm-size-badge">
                                    {product.size.split(',').length} Size{product.size.split(',').length > 1 ? 's' : ''}
                                </span>
                            )}
                            {product.product_image && (
                                <span className="apm-image-count">
                                    {product.product_image.split(',').filter(Boolean).length} Image{product.product_image.split(',').filter(Boolean).length > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="apm-action-buttons">
                        <button
                            onClick={() => handleEdit(product)}
                            className="apm-edit-btn"
                            title="Edit Product"
                            aria-label="Edit Product"
                        >
                            <Pencil size={18} />
                        </button>
                        <button
                            onClick={() => handleDelete(product.id)}
                            className="apm-delete-btn"
                            title="Delete Product"
                            aria-label="Delete Product"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
                <p className="apm-product-description">{product.product_sub_description}</p>
            </div>
        );
    };

    const renderImageUploadSection = () => {
        const currentImages = formData.product_image 
            ? formData.product_image.split(',').map(img => img.trim()).filter(Boolean) 
            : [];

        return (
            <div className="apm-image-upload-section">
                <label className="apm-section-label">Product Images</label>
                
                <div 
                    className={`apm-drop-zone ${dragActive ? 'apm-drop-zone-active' : ''} ${uploadingImages ? 'apm-drop-zone-uploading' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => !uploadingImages && fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => e.key === 'Enter' && !uploadingImages && fileInputRef.current?.click()}
                    aria-label="Upload images"
                >
                    <div className="apm-drop-zone-content">
                        {uploadingImages ? (
                            <div className="apm-uploading-state">
                                <div className="apm-loading-spinner"></div>
                                <p>Uploading images...</p>
                            </div>
                        ) : (
                            <>
                                <Upload size={40} className="apm-upload-icon" />
                                <h4>Drag & Drop Images Here</h4>
                                <p>or click to browse files</p>
                                <span className="apm-upload-hint">JPG, PNG, GIF, WEBP • Max 5MB each</span>
                            </>
                        )}
                    </div>
                    
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e.target.files)}
                        style={{ display: 'none' }}
                        aria-hidden="true"
                    />
                </div>

                {errors.imageUpload && (
                    <p className="apm-error-text">
                        <AlertCircle size={14} />
                        {errors.imageUpload}
                    </p>
                )}

                {currentImages.length > 0 && (
                    <div className="apm-image-preview-section">
                        <h4 className="apm-preview-title">
                            Uploaded Images ({currentImages.length})
                        </h4>
                        <div className="apm-image-grid">
                            {currentImages.map((imageUrl, index) => (
                                <div key={index} className="apm-image-preview-item">
                                    <img 
                                        src={imageUrl} 
                                        alt={`Product ${index + 1}`}
                                        className="apm-preview-image"
                                        onError={(e) => { 
                                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="12">Error</text></svg>';
                                        }}
                                    />
                                    <div className="apm-image-overlay">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeImage(index);
                                            }}
                                            className="apm-remove-image-btn"
                                            title="Remove Image"
                                            aria-label="Remove image"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    {index === 0 && (
                                        <div className="apm-primary-badge">Primary</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="apm-manual-url-section">
                    <label className="apm-field-label">
                        Or add image URLs manually (comma-separated)
                    </label>
                    <textarea 
                        name="product_image" 
                        value={formData.product_image || ''} 
                        onChange={handleChange} 
                        rows="2"
                        className="apm-textarea"
                        placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                    />
                </div>
            </div>
        );
    };

    const renderForm = () => (
        <div 
            className="apm-modal-overlay" 
            onClick={handleModalBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className="apm-modal-content" ref={modalRef}>
                <div className="apm-modal-header">
                    <div className="apm-modal-header-text">
                        <h2 id="modal-title" className="apm-modal-title">
                            {isNew ? 'Add New Product' : 'Edit Product'}
                        </h2>
                        <p className="apm-modal-subtitle">
                            {isNew 
                                ? 'Create a new product by filling in the details below.'
                                : 'Update the product information. Changes are saved directly.'}
                        </p>
                    </div>
                    <div className="apm-modal-actions">
                        <button
                            onClick={() => setShowHelp(!showHelp)}
                            className={`apm-help-btn ${showHelp ? 'active' : ''}`}
                            title="Show Help"
                            aria-label="Show help"
                            aria-pressed={showHelp}
                        >
                            <HelpCircle size={20} />
                        </button>
                        <button
                            onClick={handleCloseModal}
                            className="apm-close-btn"
                            title="Close"
                            aria-label="Close modal"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {showHelp && (
                    <div className="apm-help-section">
                        <h4 className="apm-help-title">
                            <HelpCircle size={16} />
                            Quick Help Guide
                        </h4>
                        <ul className="apm-help-list">
                            <li><strong>Required fields</strong> are marked with an asterisk (*)</li>
                            <li><strong>Images:</strong> Drag & drop or click to upload. First image is the primary display image</li>
                            <li><strong>Comma-separated fields:</strong> Enter multiple values separated by commas (e.g., "S, M, L, XL")</li>
                            <li><strong>Ingredients & Percentages:</strong> Must have matching count</li>
                            <li><strong>Discount:</strong> Enter as percentage (0-100)</li>
                        </ul>
                    </div>
                )}

                <div className="apm-form-container">
                    <form className="apm-form" onSubmit={(e) => e.preventDefault()}>
                        {/* Basic Information Section */}
                        <div className="apm-form-section">
                            <h3 className="apm-section-title">Basic Information</h3>
                            
                            <div className="apm-form-group">
                                <label className="apm-field-label apm-required">Product Name</label>
                                <input 
                                    name="product_name" 
                                    value={formData.product_name || ''} 
                                    onChange={handleChange}
                                    className={`apm-input ${errors.product_name ? 'apm-input-error' : ''}`}
                                    placeholder="Enter product name"
                                />
                                {errors.product_name && (
                                    <p className="apm-error-text">
                                        <AlertCircle size={14} />
                                        {errors.product_name}
                                    </p>
                                )}
                            </div>

                            <div className="apm-form-row">
                                <div className="apm-form-group">
                                    <label className="apm-field-label apm-required">Price (₹)</label>
                                    <input 
                                        name="product_price" 
                                        type="number" 
                                        step="0.01"
                                        min="0"
                                        value={formData.product_price || ''} 
                                        onChange={handleChange}
                                        className={`apm-input ${errors.product_price ? 'apm-input-error' : ''}`}
                                        placeholder="0.00"
                                    />
                                    {errors.product_price && (
                                        <p className="apm-error-text">
                                            <AlertCircle size={14} />
                                            {errors.product_price}
                                        </p>
                                    )}
                                </div>

                                <div className="apm-form-group">
                                    <label className="apm-field-label">Discount (%)</label>
                                    <input 
                                        name="product_discount" 
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.product_discount || ''} 
                                        onChange={handleChange}
                                        className={`apm-input ${errors.product_discount ? 'apm-input-error' : ''}`}
                                        placeholder="0"
                                    />
                                    {errors.product_discount && (
                                        <p className="apm-error-text">
                                            <AlertCircle size={14} />
                                            {errors.product_discount}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="apm-form-group">
                                <label className="apm-field-label apm-required">Short Description</label>
                                <textarea 
                                    name="product_sub_description" 
                                    value={formData.product_sub_description || ''} 
                                    onChange={handleChange} 
                                    rows="2"
                                    className={`apm-textarea ${errors.product_sub_description ? 'apm-input-error' : ''}`}
                                    placeholder="Brief product description for cards and previews"
                                />
                                {errors.product_sub_description && (
                                    <p className="apm-error-text">
                                        <AlertCircle size={14} />
                                        {errors.product_sub_description}
                                    </p>
                                )}
                            </div>

                            <div className="apm-form-group">
                                <label className="apm-field-label apm-required">Full Description</label>
                                <textarea 
                                    name="product_description" 
                                    value={formData.product_description || ''} 
                                    onChange={handleChange} 
                                    rows="4"
                                    className={`apm-textarea ${errors.product_description ? 'apm-input-error' : ''}`}
                                    placeholder="Detailed product description"
                                />
                                {errors.product_description && (
                                    <p className="apm-error-text">
                                        <AlertCircle size={14} />
                                        {errors.product_description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Image Upload Section */}
                        {renderImageUploadSection()}

                        {/* Product Details Section */}
                        <div className="apm-form-section">
                            <h3 className="apm-section-title">Product Details</h3>

                            <div className="apm-form-group">
                                <label className="apm-field-label">Size Variants</label>
                                <input 
                                    name="size" 
                                    value={formData.size || ''} 
                                    onChange={handleChange}
                                    className={`apm-input ${errors.size ? 'apm-input-error' : ''}`}
                                    placeholder="S, M, L, XL (comma-separated)"
                                />
                                {errors.size && (
                                    <p className="apm-error-text">
                                        <AlertCircle size={14} />
                                        {errors.size}
                                    </p>
                                )}
                            </div>

                            <div className="apm-form-group">
                                <label className="apm-field-label">Key Benefits</label>
                                <input 
                                    name="key_benefits" 
                                    value={formData.key_benefits || ''} 
                                    onChange={handleChange}
                                    className="apm-input"
                                    placeholder="Benefit 1, Benefit 2, Benefit 3 (comma-separated)"
                                />
                            </div>

                            <div className="apm-form-group">
                                <label className="apm-field-label">Why Choose This Product?</label>
                                <textarea 
                                    name="why_choose_product" 
                                    value={formData.why_choose_product || ''} 
                                    onChange={handleChange} 
                                    rows="2"
                                    className="apm-textarea"
                                    placeholder="Explain why customers should choose this product"
                                />
                            </div>
                        </div>

                        {/* Ingredients Section */}
                        <div className="apm-form-section">
                            <h3 className="apm-section-title">Ingredients</h3>

                            <div className="apm-form-group">
                                <label className="apm-field-label">Ingredients Heading</label>
                                <input 
                                    name="ingredients_heading" 
                                    value={formData.ingredients_heading || ''} 
                                    onChange={handleChange}
                                    className="apm-input"
                                    placeholder="e.g., Key Ingredients"
                                />
                            </div>

                            <div className="apm-form-group">
                                <label className="apm-field-label">Ingredients Description</label>
                                <textarea 
                                    name="ingredients_description" 
                                    value={formData.ingredients_description || ''} 
                                    onChange={handleChange} 
                                    rows="2"
                                    className="apm-textarea"
                                    placeholder="Description about the ingredients"
                                />
                            </div>

                            <div className="apm-form-group">
                                <label className="apm-field-label">Ingredients Subheading</label>
                                <input 
                                    name="ingredients_subheading" 
                                    value={formData.ingredients_subheading || ''} 
                                    onChange={handleChange}
                                    className="apm-input"
                                    placeholder="e.g., Natural & Organic"
                                />
                            </div>

                            <div className="apm-form-row">
                                <div className="apm-form-group">
                                    <label className="apm-field-label">Ingredient Names</label>
                                    <input 
                                        name="ingredients_name" 
                                        value={formData.ingredients_name || ''} 
                                        onChange={handleChange}
                                        className="apm-input"
                                        placeholder="Ingredient A, Ingredient B (comma-separated)"
                                    />
                                </div>

                                <div className="apm-form-group">
                                    <label className="apm-field-label">Percentages</label>
                                    <input 
                                        name="percentage" 
                                        value={formData.percentage || ''} 
                                        onChange={handleChange}
                                        className={`apm-input ${errors.ingredients_percentage ? 'apm-input-error' : ''}`}
                                        placeholder="10%, 20% (must match ingredients)"
                                    />
                                </div>
                            </div>
                            {errors.ingredients_percentage && (
                                <p className="apm-error-text">
                                    <AlertCircle size={14} />
                                    {errors.ingredients_percentage}
                                </p>
                            )}
                        </div>

                        {/* Usage Section */}
                        <div className="apm-form-section">
                            <h3 className="apm-section-title">Usage Instructions</h3>

                            <div className="apm-form-group">
                                <label className="apm-field-label">How To Use Heading</label>
                                <input 
                                    name="how_to_use_heading" 
                                    value={formData.how_to_use_heading || ''} 
                                    onChange={handleChange}
                                    className="apm-input"
                                    placeholder="e.g., How To Use"
                                />
                            </div>

                            <div className="apm-form-group">
                                <label className="apm-field-label">How To Use Description</label>
                                <textarea 
                                    name="how_to_use_description" 
                                    value={formData.how_to_use_description || ''} 
                                    onChange={handleChange} 
                                    rows="3"
                                    className="apm-textarea"
                                    placeholder="Step-by-step usage instructions"
                                />
                            </div>

                            <div className="apm-form-group">
                                <label className="apm-field-label">Pro Tips</label>
                                <textarea 
                                    name="pro_tips" 
                                    value={formData.pro_tips || ''} 
                                    onChange={handleChange} 
                                    rows="2"
                                    className="apm-textarea"
                                    placeholder="Expert tips for best results"
                                />
                            </div>
                        </div>
                    </form>
                </div>
                
                {/* Form Actions */}
                <div className="apm-form-actions">
                    <button
                        type="button"
                        onClick={handleCloseModal}
                        className="apm-cancel-btn"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={isNew ? handleCreate : handleUpdate}
                        disabled={loading || uploadingImages}
                        className="apm-submit-btn"
                    >
                        {loading ? (
                            <>
                                <div className="apm-loading-spinner-small"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                {isNew ? 'Create Product' : 'Update Product'}
                            </>
                        )}
                    </button>
                </div>
                
                {/* Error Messages */}
                {Object.keys(errors).filter(key => !['product_name', 'product_price', 'product_discount', 'product_sub_description', 'product_description', 'size', 'ingredients_percentage', 'imageUpload'].includes(key)).length > 0 && (
                    <div className="apm-error-container">
                        <div className="apm-error-header">
                            <AlertCircle size={18} />
                            <span>Error</span>
                        </div>
                        <ul className="apm-error-list">
                            {Object.entries(errors)
                                .filter(([key]) => !['product_name', 'product_price', 'product_discount', 'product_sub_description', 'product_description', 'size', 'ingredients_percentage', 'imageUpload'].includes(key))
                                .map(([key, error]) => (
                                    <li key={key}>{error}</li>
                                ))}
                        </ul>
                    </div>
                )}

                {/* Success Message in Modal */}
                {success && (editingProduct !== null || isNew) && (
                    <div className="apm-success-container">
                        <CheckCircle size={18} />
                        <span>{success}</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="apm-container">
            <div className="apm-main-content">
                {/* Header */}
                <div className="apm-header">
                    <div className="apm-header-text">
                        <h1 className="apm-main-title">Product Manager</h1>
                        <p className="apm-subtitle">
                            Manage your product catalog. Add, edit, or remove products as needed.
                        </p>
                    </div>
                    <div className="apm-header-actions">
                        <button
                            onClick={handleRefresh}
                            className={`apm-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                            title="Refresh Products"
                            disabled={loading || isRefreshing}
                        >
                            <RefreshCw size={18} />
                        </button>
                        <button
                            onClick={handleAddNew}
                            className="apm-add-new-btn"
                            title="Add New Product"
                        >
                            <PlusCircle size={20} />
                            <span>Add Product</span>
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="apm-search-section">
                    <div className="apm-search-wrapper">
                        <Search size={18} className="apm-search-icon" />
                        <input
                            type="text"
                            placeholder="Search products by name or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="apm-search-input"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="apm-search-clear"
                                aria-label="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="apm-product-count">
                        {filteredProducts.length} of {products.length} product{products.length !== 1 ? 's' : ''}
                    </div>
                </div>

                {/* Success Toast */}
                {success && !(editingProduct !== null || isNew) && (
                    <div className="apm-toast apm-toast-success">
                        <CheckCircle size={18} />
                        <span>{success}</span>
                    </div>
                )}
                
                {/* Product List */}
                <div className="apm-product-list">
                    {loading && !isRefreshing ? (
                        <div className="apm-loading-container">
                            <div className="apm-loading-spinner"></div>
                            <p>Loading products...</p>
                        </div>
                    ) : filteredProducts.length > 0 ? (
                        filteredProducts.map(renderProductCard)
                    ) : searchTerm ? (
                        <div className="apm-no-results">
                            <Search size={48} />
                            <h3>No products found</h3>
                            <p>No products match your search term "{searchTerm}"</p>
                            <button onClick={() => setSearchTerm('')} className="apm-clear-search-btn">
                                Clear Search
                            </button>
                        </div>
                    ) : (
                        <div className="apm-empty-state">
                            <ImageIcon size={64} />
                            <h3>No Products Yet</h3>
                            <p>Start by adding your first product to the catalog.</p>
                            <button onClick={handleAddNew} className="apm-add-first-btn">
                                <PlusCircle size={18} />
                                Add Your First Product
                            </button>
                        </div>
                    )}
                </div>
                
                {/* Form Modal */}
                {(editingProduct !== null || isNew) && renderForm()}
            </div>
        </div>
    );
}