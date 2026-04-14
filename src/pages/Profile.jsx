import React, { useEffect, useState } from 'react';
import { User, LogOut, Settings as SettingsIcon, Bell, HelpCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../lib/api.js';
import './Profile.css';

const Profile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                // Fetch logged in user
                const userStr = sessionStorage.getItem('iwogate_user');
                if (!userStr) {
                    navigate('/login');
                    return;
                }
                const localUser = JSON.parse(userStr);
                const data = await getUser(localUser.id);
                setUser(data.user || localUser);
            } catch (err) {
                console.error("Failed to fetch user:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [navigate]);

    const handleLogout = () => {
        if (confirm("Apakah Anda yakin ingin keluar?")) {
            sessionStorage.removeItem('iwogate_user');
            navigate('/login');
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" size={32} /></div>;

    return (
        <div className="profile-page animate-fade-in">
            <div className="profile-header">
                {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" className="avatar-large" style={{ objectFit: 'cover' }} />
                ) : (
                    <div className="avatar-large">{user?.name ? user.name.charAt(0) : 'U'}</div>
                )}
                <h2>{user?.name || 'Pengguna'}</h2>
                <p>{user?.role || 'Staff'}</p>
                <span className="text-secondary text-sm mt-1">{user?.department}</span>
            </div>

            <div className="profile-menu">
                <button className="menu-group">
                    <div className="menu-icon"><User size={20} /></div>
                    <span>Edit Profil</span>
                </button>
                <button className="menu-group">
                    <div className="menu-icon"><Bell size={20} /></div>
                    <span>Notifikasi</span>
                    <span className="badge">3</span>
                </button>
                <button className="menu-group" onClick={() => navigate('/settings')}>
                    <div className="menu-icon"><SettingsIcon size={20} /></div>
                    <span>Pengaturan</span>
                </button>
                <button className="menu-group">
                    <div className="menu-icon"><HelpCircle size={20} /></div>
                    <span>Bantuan</span>
                </button>
                <button className="menu-group text-red" onClick={handleLogout}>
                    <div className="menu-icon"><LogOut size={20} /></div>
                    <span>Keluar</span>
                </button>
            </div>
        </div>
    );
};
export default Profile;
