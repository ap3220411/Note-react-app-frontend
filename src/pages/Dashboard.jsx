import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../lib/api";
import NoteModal from "../components/NoteModal";

const DashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);

  const initials = useMemo(() => {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user?.name]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("auth_token");
    navigate("/login", { replace: true });
  }, [navigate]);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/profile");
      setUser(data?.data);
    } catch (error) {
      if (error?.response?.status === 401) {
        handleLogout();
        toast.error("Session expired. Please log in again.");
      } else {
        toast.error("Failed to load profile");
      }
    }
  }, [handleLogout]);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/note/notes");
      setNotes(data?.data || []);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401) {
        handleLogout();
      }
      toast.error(error?.response?.data?.message || "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    if (!localStorage.getItem("auth_token")) {
      navigate("/login", { replace: true });
      return;
    }
    fetchProfile();
    fetchNotes();
  }, [fetchNotes, fetchProfile, navigate]);

  const handleSaveNote = async (payload) => {
    setSaving(true);
    try {
      if (editingNote) {
        const { data } = await api.put(
          `/note/notes/${editingNote._id}`,
          payload
        );
        const updated = data?.data;
        setNotes((prev) =>
          prev.map((note) => (note._id === updated._id ? updated : note))
        );
        toast.success("Note updated successfully");
      } else {
        const { data } = await api.post("/note/notes", payload);
        setNotes((prev) => [data?.data, ...prev]);
        toast.success("Note created successfully");
      }
      setModalOpen(false);
      setEditingNote(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this note?");
    if (!confirmed) return;
    try {
      await api.delete(`/note/notes/${id}`);
      setNotes((prev) => prev.filter((note) => note._id !== id));
      toast.success("Note deleted successfully");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete note");
    }
  };

  const openNewModal = () => {
    setEditingNote(null);
    setModalOpen(true);
  };

  const openEditModal = (note) => {
    setEditingNote(note);
    setModalOpen(true);
  };

  // Close profile popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfilePopup && !event.target.closest('.profile-popup') && !event.target.closest('.profile-icon')) {
        setShowProfilePopup(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showProfilePopup]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 rounded-2xl bg-white shadow-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            {/* Left side with logo and profile icon */}
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-xl font-bold text-white shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">{user?.name}</h1>
                  <p className="text-gray-600 text-sm">Your Digital Notebook</p>
                </div>
              </div>
            </div>

            {/* Right side with profile icon and buttons */}
            <div className="flex items-center gap-4">
              {/* Add Note Button */}
              <button
                onClick={openNewModal}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-medium shadow-md hover:shadow-lg hover:from-emerald-500 hover:to-emerald-600 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Note
              </button>

              {/* Profile Icon */}
              <div className="relative">
                <button
                  onClick={() => setShowProfilePopup(!showProfilePopup)}
                  className="profile-icon flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
                >
                  {initials}
                </button>

                {/* Profile Popup */}
                {showProfilePopup && (
                  <div className="profile-popup absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                    {/* Popup Header */}
                    <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-6 text-white">
                      <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-2xl font-bold">
                          {initials}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{user?.name}</h3>
                          <p className="text-emerald-100 text-sm mt-1">{user?.email}</p>
                          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-white/20 text-sm">
                            Active User
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Profile Details */}
                    <div className="p-5">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="p-2 bg-emerald-100 rounded-lg">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Full Name</p>
                            <p className="font-medium text-gray-800">{user?.name}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="p-2 bg-emerald-100 rounded-lg">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89-5.26a2 2 0 012.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Email Address</p>
                            <p className="font-medium text-gray-800">{user?.email}</p>
                          </div>
                        </div>

                        {user?.phone && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Phone Number</p>
                              <p className="font-medium text-gray-800">{user?.phone}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-emerald-600">{notes.length}</p>
                            <p className="text-xs text-gray-600 mt-1">Notes</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">{new Date().getDate()}</p>
                            <p className="text-xs text-gray-600 mt-1">Day</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-purple-600">
                              {new Date().toLocaleDateString('en-US', { month: 'short' })}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">Month</p>
                          </div>
                        </div>
                      </div>

                      {/* Logout Button */}
                      <div className="mt-6">
                        <button
                          onClick={handleLogout}
                          className="w-full py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Notes Only */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">My Notes</h2>
              <p className="text-gray-600 mt-1">Capture your thoughts, ideas, and reminders</p>
            </div>
            <div className="px-4 py-2 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-full text-emerald-700 font-medium border border-emerald-200">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Loading your notes...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-full flex items-center justify-center mb-4 border border-emerald-200">
                <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No notes yet</h3>
              <p className="text-gray-600 mb-6">Start capturing your thoughts and ideas</p>
              <button
                onClick={openNewModal}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-medium shadow-md hover:shadow-lg transition flex items-center gap-2 mx-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your First Note
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notes.map((note) => (
                <div
                  key={note._id}
                  className="group relative bg-white rounded-xl p-5 border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Note Content */}
                  <div className="mb-5">
                    {/* Note Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800 line-clamp-1">
                          {note.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {new Date(note.createdAt || note.updatedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {new Date(note.createdAt || note.updatedAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      {/* Note Icon */}
                      <div className="p-2 rounded-lg bg-emerald-50">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Note Description */}
                    {note.discriptipn && (
                      <div className="mt-3">
                        <p className="text-gray-600 line-clamp-4 leading-relaxed">
                          {note.discriptipn}
                        </p>
                      </div>
                    )}
                    
                    {/* Preview Text if description is long */}
                    {note.discriptipn && note.discriptipn.length > 150 && (
                      <span className="inline-block mt-3 text-sm text-emerald-600 font-medium">
                        Read more...
                      </span>
                    )}
                  </div>
                  
                  {/* Footer with Actions */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 italic">
                        Last updated: {new Date(note.updatedAt || note.createdAt).toLocaleDateString()}
                      </span>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(note)}
                          className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all duration-200 hover:scale-105"
                          title="Edit note"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(note._id)}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-200 hover:scale-105"
                          title="Delete note"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Gradient Accent */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              ))}
            </div>
          )}

          {notes.length > 0 && (
            <div className="mt-8">
              <button
                onClick={openNewModal}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100 border-2 border-dashed border-emerald-200 hover:border-emerald-400 hover:bg-emerald-200/50 transition-all duration-200 flex flex-col items-center justify-center gap-2 text-emerald-700 hover:text-emerald-800 font-medium group"
              >
                <div className="p-2 rounded-full bg-emerald-200 group-hover:bg-emerald-300 transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-lg">Add Another Note</span>
                <span className="text-sm text-emerald-600 font-normal">Click to add a new note</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Note Modal */}
      {modalOpen && (
        <NoteModal
          key={editingNote?._id || "new"}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveNote}
          initialData={editingNote}
          saving={saving}
        />
      )}
    </div>
  );
};

export default DashboardPage;