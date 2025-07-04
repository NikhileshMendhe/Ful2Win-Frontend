import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Header from '../components/Header';
import BackgroundBubbles from '../components/BackgroundBubbles';
import Button from '../components/Button';
import CommunityProfile from '../components/CommunityProfile';
import ChatScreen from '../components/ChatScreen';
import Challenges from '../components/Challenges';
import LeaderboardPage from '../components/LeaderboardPage';

import {
  FiHome,
  FiMessageSquare,
  FiAward,
  FiStar,
  FiClock,
  FiMessageCircle,
  FiHeart,
  FiShare2,
  FiUserPlus,
} from 'react-icons/fi';
import { RiSwordLine } from 'react-icons/ri';
import { BsThreeDotsVertical, BsHeart, BsChat, BsShare, BsBookmark, BsEmojiSmile } from 'react-icons/bs';
import { FaRegComment, FaRegBookmark, FaBookmark, FaRegHeart, FaHeart, FaRegShareSquare, FaImage, FaVideo, FaPoll } from 'react-icons/fa';
import { IoMdSend } from 'react-icons/io';
import { formatTimeAgo } from '../utils/timeUtils';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authService from '../services/api';

const Community = () => {
  const [activeTab, setActiveTab] = useState('feed');
  const [activeType, setActiveType] = useState('all');
  const [newPostContent, setNewPostContent] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileType, setFileType] = useState('');
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate(); // For Challenges redirect

  // Function to enhance posts with user data
  const enhancePostsWithUserData = async (posts) => {
    try {
      const enhancedPosts = [];
      
      for (const post of posts) {
        try {
          // Check if user data is already in the post
          if (post.user?._id || post.author?._id) {
            enhancedPosts.push({
              ...post,
              user: post.user || post.author || { _id: 'unknown' }
            });
            continue;
          }
          
          // If we have a user ID, try to fetch the user data
          const userId = post.user || post.userId || post.author || post.createdBy?._id || post.createdBy;
          if (userId && typeof userId === 'string') {
            console.log(`Fetching user data for post ${post._id}, user ID:`, userId);
            try {
              const userData = await authService.getUserProfile(userId);
              enhancedPosts.push({ ...post, user: userData });
            } catch (error) {
              console.error(`Failed to fetch user ${userId} for post ${post._id}:`, error);
              enhancedPosts.push({ ...post, user: { _id: userId } });
            }
          } else {
            console.log('No valid user ID found for post:', post._id, 'post data:', post);
            enhancedPosts.push({ ...post, user: { _id: 'unknown' } });
          }
        } catch (error) {
          console.error('Error processing post:', post._id, error);
          enhancedPosts.push({ ...post, user: { _id: 'unknown' } });
        }
      }
      
      return enhancedPosts;
    } catch (error) {
      console.error('Error in enhancePostsWithUserData:', error);
      return posts.map(post => ({
        ...post,
        user: post.user || post.author || { _id: 'unknown' }
      }));
    }
  };

  // Fetch current user data and posts
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch current user data
        const userData = await authService.getCurrentUserProfile();
        console.log('Current user data:', userData);
        setCurrentUser(userData);

        // Fetch community posts with user data populated
        let postsData = await authService.getCommunityPosts({ 
          sort: '-createdAt',
          limit: 20,
          populate: 'user author createdBy', // Include all possible user reference fields
        });
        
        console.log('Raw posts data:', JSON.stringify(postsData, null, 2));
        
        // Process posts to ensure we have user data
        if (Array.isArray(postsData)) {
          // First try to use the populated user data
          const processedPosts = postsData.map(post => ({
            ...post,
            user: post.user || post.author || post.createdBy || null
          }));
          
          // Then enhance any posts that still don't have user data
          const enhancedPosts = await enhancePostsWithUserData(processedPosts);
          console.log('Processed posts with user data:', enhancedPosts);
          setPosts(enhancedPosts);
        } else {
          setPosts([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load posts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFileChange = (e) => {
    try {
      console.log('File input changed, files:', e.target.files);
      const file = e.target.files[0];
      
      if (!file) {
        console.log('No file selected');
        return;
      }

      console.log('Selected file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      });

      // Check file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        const errorMsg = `Unsupported file type: ${file.type}. Please upload an image or video file.`;
        console.error(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Check file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        const errorMsg = `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds the 5MB limit`;
        console.error(errorMsg);
        toast.error('File size should be less than 5MB');
        return;
      }

      console.log('File is valid, creating preview URL...');
      const previewUrl = URL.createObjectURL(file);
      console.log('Preview URL created:', previewUrl);
      
      setSelectedFile(file);
      setFileType(file.type.startsWith('image/') ? 'image' : 'video');
      setPreviewUrl(previewUrl);
      
    } catch (error) {
      console.error('Error in handleFileChange:', error);
      toast.error('Failed to process the selected file');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setFileType('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const communityTabs = [
    { id: 'feed', label: 'Feed', icon: <FiHome className="mr-1" /> },
    { id: 'followers', label: 'Followers', icon: <FiMessageSquare className="mr-1" /> },
    { id: 'challenges', label: 'Challenges', icon: <RiSwordLine className="mr-1" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <FiAward className="mr-1" /> },
  ];

  const typeTabs = [
    { id: 'all', label: 'All' },
    { id: 'popular', label: 'Popular', icon: <FiStar className="mr-1" /> },
    { id: 'recent', label: 'Recent', icon: <FiClock className="mr-1" /> },
    { id: 'discussions', label: 'Discussions', icon: <FiMessageCircle className="mr-1" /> },
  ];

  // Filter posts based on active tab
  const filteredPosts = React.useMemo(() => {
    if (activeType === 'all') return posts;
    return posts.filter(post => post.type === activeType);
  }, [posts, activeType]);

  const handleCreatePost = async () => {
    console.log('handleCreatePost called');
    
    if (!newPostContent.trim() && !selectedFile) {
      const errorMsg = 'Please add some content or a file to your post';
      console.error(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      console.log('Starting post creation...');
      setIsCreatingPost(true);
      
      // Create FormData
      const formData = new FormData();
      
      // Add file if selected
      if (selectedFile) {
        console.log('Adding file to FormData:', {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size
        });
        formData.append('media', selectedFile);
      } else {
        console.log('No file selected for upload');
      }
      
      // Add post content
      console.log('Adding post content:', newPostContent);
      formData.append('content', newPostContent);
      
      // Add any additional data needed by your API
      const postData = {
        type: 'post',
        timestamp: new Date().toISOString()
      };
      formData.append('data', JSON.stringify(postData));
      
      // Log FormData contents
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File - ${value.name} (${value.type}, ${value.size} bytes)`);
        } else {
          console.log(`${key}:`, value);
        }
      }
      
      console.log('Sending request to create post...');
      const response = await authService.createPost(formData);
      
      if (!response) {
        const errorMsg = 'No response from server';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('Server response:', response);
      
      // Get current user data
      console.log('Fetching current user profile...');
      const currentUser = await authService.getCurrentUserProfile();
      console.log('Current user data:', currentUser);
      
      // Create new post object with proper media handling
      const newPost = {
        ...(response.data?.post || response), // Handle both response formats
        _id: response.data?.post?._id || response._id || `temp-${Date.now()}`,
        user: currentUser,
        content: response.data?.post?.content || response.content || newPostContent,
        createdAt: response.data?.post?.createdAt || response.createdAt || new Date().toISOString(),
        likes: [],
        comments: [],
        media: {
          url: response.data?.mediaUrl || response.mediaUrl || (selectedFile ? URL.createObjectURL(selectedFile) : null),
          type: response.data?.mediaType || response.mediaType || (selectedFile ? selectedFile.type : null)
        }
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Created new post:', {
          ...newPost,
          media: newPost.media ? {
            ...newPost.media,
            // Don't log the entire URL if it's a blob URL as it can be very long
            url: newPost.media.url?.startsWith('blob:') ? 
                 '[Blob URL]' : 
                 newPost.media.url
          } : null
        });
      }
      
      // Update UI
      setPosts(prevPosts => [newPost, ...prevPosts]);
      setNewPostContent('');
      setShowCreatePost(false);
      setSelectedFile(null);
      setPreviewUrl('');
      setFileType('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast.success('Post created successfully!');
    } catch (error) {
      console.error('Error in handleCreatePost:', error);
      
      // More specific error messages based on the error type
      let errorMessage = 'Failed to create post. Please try again.';
      
      if (error.message.includes('File size exceeds 5MB')) {
        errorMessage = 'File size exceeds 5MB limit. Please choose a smaller file.';
      } else if (error.message.includes('Invalid file type')) {
        errorMessage = 'Invalid file type. Please upload an image or video.';
      } else if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Server responded with error:', error.response.data);
        
        if (error.response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
        } else if (error.response.status === 413) {
          errorMessage = 'File is too large. Please choose a file smaller than 5MB.';
        } else if (error.response.status === 400) {
          errorMessage = 'Invalid file type. Please upload an image or video.';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`;
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response from server:', error.request);
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something happened in setting up the request
        console.error('Request setup error:', error.message);
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsCreatingPost(false);
    }
  };



  const handleViewProfile = async (userId, post) => {
    try {
      // Navigate to the profile screen with the user ID
      navigate(`/profile/${userId}`);
    } catch (error) {
      console.error('Error navigating to profile:', error);
      toast.error('Failed to open profile');
    }
  };

  const handleTabChange = (tabId) => {
    if (tabId === 'challenges') {
      navigate('/challenges'); // Navigate to the dedicated challenges page
    } else {
      setActiveTab(tabId);
    }
  };

  const renderPosts = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      );
    }

    if (filteredPosts.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          No posts found. Be the first to post!
        </div>
      );
    }

    return filteredPosts.map((post) => {
      // Extract user data from the post
      const user = post.user || post.author || post.createdBy || { _id: 'unknown' };
      
      // Handle different possible user name fields
      const userName = user?.fullName || user?.name || user?.username || 'Unknown User';
      const userUsername = user?.username || 'user';
      const userAvatarUrl = user?.profilePicture || user?.avatar || null;
      const userInitial = userName.charAt(0).toUpperCase();
      
      const avatarElement = userAvatarUrl ? (
        <img 
          src={userAvatarUrl} 
          alt={userName}
          className="w-10 h-10 rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
          {userInitial}
        </div>
      );
      
      return (
        <div key={post._id} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/10">
          <div className="flex items-start mb-3">
            <div 
              className="cursor-pointer mr-2"
              onClick={() => handleViewProfile(user?._id || user, post)}
            >
              {avatarElement}
            </div>
            <div className="flex-1">
              <div className="flex items-center">
                <h4 className="font-semibold mr-2">
                  {userName}
                </h4>
                <span className="text-xs text-gray-400" title={new Date(post.createdAt).toLocaleString()}>
                  {formatTimeAgo(post.createdAt)}
                </span>
              </div>
              <p className="text-sm text-gray-300">
                @{userUsername}
              </p>
            </div>
            <button className="text-gray-400 hover:text-white">
              <BsThreeDotsVertical />
            </button>
          </div>
          
          <p className="mb-3">{post.content}</p>
          
          {/* Handle both old format (image) and new format (media) */}
          {(post.image || (post.media && post.media.url) || (post.images && post.images.length > 0)) && (
            <div className="mb-3 rounded-lg overflow-hidden">
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-500 mb-1">
                  Post ID: {post._id}<br />
                  Has image: {!!post.image}<br />
                  Has media: {!!(post.media && post.media.url)}<br />
                  Images count: {post.images?.length || 0}
                </div>
              )}
              
              {/* Handle single image from 'image' field (old format) */}
              {post.image && (
                <img 
                  src={post.image} 
                  alt="Post content" 
                  className="w-full h-auto max-h-96 object-contain rounded-lg bg-black/20"
                  onError={(e) => {
                    console.error('Error loading image (old format):', {
                      url: post.image,
                      postId: post._id
                    });
                    e.target.style.display = 'none';
                  }}
                  onLoad={() => {
                    if (process.env.NODE_ENV === 'development') {
                      console.log('Image loaded (old format):', post.image);
                    }
                  }}
                />
              )}
              
              {/* Handle single media from 'media' field */}
              {!post.image && post.media && post.media.url && (
                <>
                  {(!post.media.type || post.media.type.startsWith('image/')) ? (
                    <img 
                      src={post.media.url} 
                      alt="Post content" 
                      className="w-full h-auto max-h-96 object-contain rounded-lg bg-black/20"
                      onError={(e) => {
                        console.error('Error loading image (media format):', {
                          url: post.media.url,
                          type: post.media.type,
                          postId: post._id
                        });
                        e.target.style.display = 'none';
                      }}
                      onLoad={() => {
                        if (process.env.NODE_ENV === 'development') {
                          console.log('Image loaded (media format):', post.media.url);
                        }
                      }}
                    />
                  ) : post.media.type.startsWith('video/') ? (
                    <video 
                      src={post.media.url}
                      controls
                      className="w-full max-h-96 rounded-lg"
                      onError={(e) => {
                        console.error('Error loading video:', {
                          url: post.media.url,
                          type: post.media.type,
                          postId: post._id
                        });
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="p-4 bg-gray-800/50 text-center text-gray-400 rounded-lg">
                      Unsupported media type: {post.media.type || 'unknown'}
                    </div>
                  )}
                </>
              )}
              
              {/* Handle multiple images from 'images' array */}
              {!post.image && !(post.media && post.media.url) && post.images && post.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {post.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img.url || img}
                      alt={`Post content ${idx + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                      onError={(e) => {
                        console.error('Error loading image from images array:', {
                          url: img.url || img,
                          index: idx,
                          postId: post._id
                        });
                        e.target.style.display = 'none';
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between text-gray-400 text-sm border-t border-white/10 pt-3">
            <button className="flex items-center hover:text-white">
              <FiHeart className="mr-1" /> {post.likes?.length || 0}
            </button>
            <button className="flex items-center hover:text-white">
              <FiMessageCircle className="mr-1" /> {post.comments?.length || 0}
            </button>
            <button className="flex items-center hover:text-white">
              <FiShare2 className="mr-1" /> Share
            </button>
          </div>
        </div>
      );
    });
  };

  // Fetch current user data and posts
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current user data
        const userData = await authService.getCurrentUserProfile();
        console.log('Current user data:', userData);
        setCurrentUser(userData);
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load user data');
      }
    };

    fetchData();
  }, []);

  return (
    <div className="relative min-h-screen pb-24 overflow-hidden text-white bg-blueGradient">
      <BackgroundBubbles />
      {viewingProfile && (
        <CommunityProfile
          user={viewingProfile}
          onClose={() => setViewingProfile(null)}
        />
      )}

      {!selectedFriend && (
        <div className="relative z-10">
          <Header />

          <div className="pt-20 md:pt-0 w-full flex justify-center">
            <div className="w-full max-w-3xl px-4">
              <div className="hidden md:flex gap-2 mb-2 overflow-x-auto py-1 justify-end pr-1">
                {communityTabs.map((tab) => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? 'primary' : 'gradient'}
                    onClick={() => handleTabChange(tab.id)}
                    className="rounded-full px-4 py-2 flex items-center whitespace-nowrap text-sm"
                  >
                    {React.cloneElement(tab.icon, { className: 'mr-1.5' })}
                    {tab.label}
                  </Button>
                ))}
              </div>

              <div className="flex md:hidden w-full mb-2 py-1 px-1">
                <div className="w-full flex justify-start space-x-1 pr-1">
                  {communityTabs.map((tab) => (
                    <Button
                      key={tab.id}
                      variant={activeTab === tab.id ? 'primary' : 'gradient'}
                      onClick={() => handleTabChange(tab.id)}
                      className={`rounded-full ${activeTab === tab.id ? 'px-3 py-1.5' : 'p-2.5'} flex items-center justify-center`}
                      title={tab.label}
                    >
                      {React.cloneElement(tab.icon, { 
                        className: `text-sm ${activeTab === tab.id ? 'mr-1' : ''}` 
                      })}
                      {activeTab === tab.id && (
                        <span className="text-xs ml-0.5">{tab.label}</span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full">
            {activeTab === 'feed' && (
              <div className="w-full max-w-3xl px-4 mx-auto mt-1">
                <div className="w-full mb-2 py-1">
                  <div className="flex justify-start space-x-1 pr-1">
                    {typeTabs.map((tab) => (
                      <Button
                        key={tab.id}
                        variant={activeType === tab.id ? 'primary' : 'outline'}
                        onClick={() => setActiveType(tab.id)}
                        className={`rounded-full text-sm ${activeType === tab.id ? 'px-3 py-1.5' : 'p-2.5'} flex items-center justify-center`}
                        title={tab.label}
                      >
                        {tab.icon ? (
                          <>
                            {React.cloneElement(tab.icon, { 
                              className: `text-sm ${activeType === tab.id ? 'mr-1' : ''}` 
                            })}
                            {activeType === tab.id && (
                              <span className="text-xs">{tab.label}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs">{tab.label}</span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4">Create Post</h3>
                  <div className="flex items-start">
                    {currentUser?.profilePicture ? (
                      <img 
                        src={currentUser.profilePicture} 
                        alt={currentUser.name || 'User'}
                        className="w-10 h-10 rounded-full object-cover mr-3 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-3 flex-shrink-0">
                        {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex-1">
                      {!showCreatePost ? (
                        <>
                          <input
                            type="text"
                            placeholder="What's on your mind?"
                            className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white mb-3 focus:outline-none focus:ring-0 focus:border-white/20"
                            onClick={() => setShowCreatePost(true)}
                            readOnly
                          />
                        </>
                      ) : (
                        <div>
                          <textarea
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="Share your thoughts..."
                            className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white mb-3 focus:outline-none focus:ring-0 focus:border-white/30 resize-none"
                            rows="3"
                            autoFocus
                          />
                          {previewUrl && (
                            <div className="mt-2 relative">
                              {fileType === 'image' ? (
                                <img 
                                  src={previewUrl} 
                                  alt="Preview" 
                                  className="max-h-60 w-auto rounded-lg object-contain"
                                />
                              ) : (
                                <video 
                                  src={previewUrl} 
                                  controls 
                                  className="max-h-60 w-auto rounded-lg"
                                />
                              )}
                              <button
                                type="button"
                                onClick={handleRemoveFile}
                                className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-1"
                                title="Remove media"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                        <div className="flex space-x-2">
                          <input
                            type="file"
                            id="media-upload"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*,video/*"
                            onChange={handleFileChange}
                          />
                          <button 
                            type="button"
                            className="flex items-center text-sm text-gray-300 hover:text-white whitespace-nowrap"
                            onClick={() => document.getElementById('media-upload').click()}
                          >
                            <FaImage className="mr-1" /> {fileType === 'video' ? 'Change Media' : 'Photo/Video'}
                          </button>
                          <button className="flex items-center text-sm text-gray-300 hover:text-white whitespace-nowrap">
                            <FaPoll className="mr-1" /> Poll
                          </button>
                        </div>
                        <div className="flex-shrink-0">
                          {showCreatePost ? (
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                onClick={() => setShowCreatePost(false)} 
                                size="sm"
                                disabled={isCreatingPost}
                              >
                                Cancel
                              </Button>
                              <Button 
                                variant="primary" 
                                onClick={handleCreatePost}
                                size="sm"
                                disabled={!newPostContent.trim() || isCreatingPost}
                              >
                                {isCreatingPost ? 'Posting...' : 'Post'}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setShowCreatePost(true)}
                            >
                              Post
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {renderPosts()}
                </div>
              </div>
            )}

            {activeTab === 'followers' && (
              <ChatScreen selectedFriend={selectedFriend} setSelectedFriend={setSelectedFriend} />
            )}
            {activeTab === 'leaderboard' && <LeaderboardPage />}
          </div>
        </div>
      )}

      {selectedFriend && (
        <ChatScreen selectedFriend={selectedFriend} setSelectedFriend={setSelectedFriend} />
      )}

      {!selectedFriend && <Navbar />}
    </div>
  );
};

export default Community;
