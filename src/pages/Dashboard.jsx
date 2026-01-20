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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Noteful
                </h1>
                <p className="text-xs text-gray-500">Your thoughts, organized</p>
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={openNewModal}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200 flex items-center group"
              >
                <svg className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">New Note</span>
                <span className="sm:hidden">Add</span>
              </button>

              {/* Profile */}
              <div className="relative">
                <button
                  onClick={() => setShowProfilePopup(!showProfilePopup)}
                  className="profile-icon h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center"
                >
                  {initials}
                </button>

                {/* Profile Popup */}
                {showProfilePopup && (
                  <div className="profile-popup absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200/50 backdrop-blur-lg z-50 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-5">
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg">
                          {initials}
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{user?.name}</h3>
                          <p className="text-emerald-100 text-sm mt-1">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-emerald-50 rounded-xl">
                          <div className="text-lg font-bold text-emerald-600">{notes.length}</div>
                          <div className="text-xs text-gray-600">Notes</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-xl">
                          <div className="text-lg font-bold text-blue-600">{new Date().getDate()}</div>
                          <div className="text-xs text-gray-600">Day</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-xl">
                          <div className="text-lg font-bold text-purple-600">
                            {new Date().toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                          <div className="text-xs text-gray-600">Month</div>
                        </div>
                      </div>

                      <button
                        onClick={handleLogout}
                        className="w-full py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-all duration-200 flex items-center justify-center"
                      >
                        <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, <span className="text-emerald-600">{user?.name}</span>! 👋
              </h1>
              <p className="text-gray-600 mt-2">Here's everything you've captured so far</p>
            </div>
            <div className="hidden sm:block px-4 py-2 bg-white border border-gray-200 rounded-xl">
              <span className="text-sm font-medium text-gray-700">
                {notes.length} {notes.length === 1 ? 'note' : 'notes'} total
              </span>
            </div>
          </div>
        </div>

        {/* Notes Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="h-16 w-16 border-4 border-gray-200 rounded-full"></div>
              <div className="h-16 w-16 border-4 border-emerald-600 border-t-transparent rounded-full absolute top-0 left-0 animate-spin"></div>
            </div>
            <p className="mt-4 text-gray-600">Loading your notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="h-24 w-24 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg className="h-12 w-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No notes yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start capturing your ideas, thoughts, and reminders. Your first note is just a click away.
            </p>
            <button
              onClick={openNewModal}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-medium shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200 inline-flex items-center group"
            >
              <svg className="h-6 w-6 mr-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Note
            </button>
          </div>
        ) : (
          <>
            {/* Notes Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {notes.map((note) => (
                <div
                  key={note._id}
                  className="group bg-white rounded-2xl border border-gray-200 p-6 hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Note Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 mr-4">
                      <h3 className="font-bold text-gray-900 text-lg line-clamp-2 mb-2">
                        {note.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center text-xs text-gray-500">
                          <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(note.createdAt || note.updatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(note.createdAt || note.updatedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Note Actions */}
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => openEditModal(note)}
                        className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all duration-200 hover:scale-105"
                        title="Edit note"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(note._id)}
                        className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 hover:scale-105"
                        title="Delete note"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Note Content */}
                  {note.discriptipn && (
                    <p className="text-gray-600 line-clamp-3 mb-6">
                      {note.discriptipn}
                    </p>
                  )}

                  {/* Note Footer */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Updated {new Date(note.updatedAt || note.createdAt).toLocaleDateString()}
                      </span>
                      <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add More Notes */}
            <div className="mt-12">
              <button
                onClick={openNewModal}
                className="w-full border-2 border-dashed border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50 rounded-2xl py-8 transition-all duration-200 group"
              >
                <div className="flex flex-col items-center">
                  <div className="h-14 w-14 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="h-7 w-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Add Another Note</h4>
                  <p className="text-sm text-gray-600 max-w-md text-center">
                    Capture another idea, reminder, or thought
                  </p>
                </div>
              </button>
            </div>
          </>
        )}
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