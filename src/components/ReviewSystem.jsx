import React, { useEffect, useState, useCallback } from 'react'; 
import { supabase } from '../supabaseClient';
import { Star, X } from 'lucide-react';
import '../styles/ReviewSystem.css'; // Make sure your CSS uses these updated classNames

const ReviewSystem = ({ productId }) => {
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [newRating, setNewRating] = useState(0);
  const [newReviewText, setNewReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editHover, setEditHover] = useState(0);
  const [editText, setEditText] = useState('');

  const fetchReviews = useCallback(async () => {
    if (!productId) return;
    const { data, error } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else setReviews(data);
  }, [productId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetchReviews();

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchReviews]);

  const renderStars = (rating, onClick, onHover) =>
    Array(5)
      .fill(0)
      .map((_, i) => {
        const filled = i < rating;
        return (
          <Star
            key={i}
            size={20}
            fill={filled ? '#FFB800' : 'none'}
            stroke={filled ? '#FFB800' : '#ccc'}
            className={onClick ? 'rs-star cursor-pointer' : 'rs-star'}
            onMouseEnter={() => onHover?.(i + 1)}
            onMouseLeave={() => onHover?.(0)}
            onClick={() => onClick?.(i + 1)}
          />
        );
      });

  const handleSubmit = async () => {
    if (!user) return setError('Please sign in.');
    if (newRating === 0) return setError('Select a rating.');
    if (!newReviewText.trim()) return setError('Write a review.');

    setSubmitting(true);
    setError('');

    const { error } = await supabase.from('product_reviews').insert({
      product_id: productId,
      user_id: user.id,
      user_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Guest',
      rating: newRating,
      review_text: newReviewText.trim()
    });

    if (error) {
      setError('Failed to submit review.');
    } else {
      setNewRating(0);
      setHoverRating(0);
      setNewReviewText('');
      fetchReviews();
    }
    setSubmitting(false);
  };

  const handleEdit = (review) => {
    setEditingReview(review.id);
    setEditRating(review.rating);
    setEditText(review.review_text);
  };

  const handleUpdate = async () => {
    if (!editRating || !editText.trim()) return;
    await supabase
      .from('product_reviews')
      .update({ rating: editRating, review_text: editText.trim() })
      .eq('id', editingReview)
      .eq('user_id', user.id);

    setEditingReview(null);
    fetchReviews();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    await supabase.from('product_reviews').delete().eq('id', id).eq('user_id', user.id);
    fetchReviews();
  };

  const ReviewCard = ({ review }) => (
    <div className="rs-card">
      <div className="rs-card-header">
        <div>
          <strong>{review.user_name}</strong>
          <p className="rs-card-date">{new Date(review.created_at).toLocaleDateString()}</p>
        </div>
        {user?.id === review.user_id && (
          <div className="rs-card-actions">
            <button onClick={() => handleEdit(review)} className="rs-edit-btn">Edit</button>
            <button onClick={() => handleDelete(review.id)} className="rs-delete-btn">Delete</button>
          </div>
        )}
      </div>

      {editingReview === review.id ? (
        <div>
          <div className="rs-stars">{renderStars(editHover || editRating, setEditRating, setEditHover)}</div>
          <textarea
            className="rs-textarea"
            rows={3}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
          />
          <button className="rs-update-btn" onClick={handleUpdate}>Update</button>
        </div>
      ) : (
        <>
          <div className="rs-stars">{renderStars(review.rating)}</div>
          <p className="rs-text">{review.review_text}</p>
        </>
      )}
    </div>
  );

  return (
    <section className="rs-section">
      <h2 className="rs-heading">Customer Reviews ({reviews.length})</h2>

      <div className="rs-form">
        <h3 className="rs-form-title">Write a Review</h3>
        <div className="rs-stars">{renderStars(hoverRating || newRating, setNewRating, setHoverRating)}</div>
        <textarea
          className="rs-textarea"
          rows={4}
          placeholder="Write your review here..."
          value={newReviewText}
          onChange={(e) => setNewReviewText(e.target.value)}
        />
        {error && <p className="rs-error">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="rs-submit-btn"
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>

      <div className="rs-list">
        {reviews.length === 0 ? (
          <p>No reviews yet.</p>
        ) : (
          <>
            {reviews.slice(0, 3).map((r) => <ReviewCard key={r.id} review={r} />)}

            {reviews.length > 3 && !showAllReviews && (
              <button
                onClick={() => setShowAllReviews(true)}
                className="rs-view-all"
              >
                View All Reviews
              </button>
            )}
          </>
        )}
      </div>

      {showAllReviews && (
        <div className="rs-modal-overlay">
          <div className="rs-modal">
            <button
              onClick={() => setShowAllReviews(false)}
              className="rs-close-btn"
            >
              <X />
            </button>
            <h3 className="rs-modal-title">All Reviews ({reviews.length})</h3>
            {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
          </div>
        </div>
      )}
    </section>
  );
};

export default ReviewSystem;
