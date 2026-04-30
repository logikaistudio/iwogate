import React, { useState } from 'react';
import Pusher from 'pusher-js';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, PlusSquare, Users, User, Menu, LogOut, Bell, X } from 'lucide-react';
import { motion } from 'framer-motion';
import './Layout.css';

const MobileNav = () => {
    const location = useLocation();
    const navItems = [
        { path: '/', label: 'Home', icon: Home },
        { path: '/create', label: 'Buat Baru', icon: PlusSquare },
        { path: '/departments', label: 'Divisi', icon: Users },
        { path: '/profile', label: 'Profil', icon: User },
    ];

    return (
        <nav className="mobile-nav">
            {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                    <Link to={item.path} key={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>
                        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
};

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifOpen, setNotifOpen] = useState(false);

    const fetchNotifs = async () => {
        try {
            const res = await fetch('/api/notifications', { headers: { 'Content-Type': 'application/json', ...(sessionStorage.getItem('iwogate_token') ? { Authorization: `Bearer ${sessionStorage.getItem('iwogate_token')}` } : {}) } });
            if (!res.ok) return;
            const body = await res.json();
            setNotifications(body.notifications || []);
            setUnreadCount((body.notifications || []).filter(n => !n.is_read).length);
        } catch (e) {
            // ignore
        }
    };

    React.useEffect(() => {
        let mounted = true;
        const load = async () => {
            const userStr = sessionStorage.getItem('iwogate_user');
            if (userStr && mounted) setCurrentUser(JSON.parse(userStr));
            await fetchNotifs();
            // subscribe to Pusher channel for realtime notifications
            try {
                const user = JSON.parse(sessionStorage.getItem('iwogate_user') || 'null');
                const key = import.meta.env.VITE_PUSHER_KEY || window.__VITE_PUSHER_KEY;
                if (user && key) {
                    const p = new Pusher(key, { cluster: import.meta.env.VITE_PUSHER_CLUSTER || window.__VITE_PUSHER_CLUSTER || 'mt1' });
                    const channel = p.subscribe(`notifications-${user.id}`);
                    channel.bind('notification', (payload) => {
                        if (!mounted) return;
                        setNotifications(prev => [payload, ...prev]);
                        setUnreadCount(prev => prev + 1);
                    });
                }
            } catch (e) {
                console.error('Pusher init failed', e);
            }
        };
        load();
        const id = setInterval(fetchNotifs, 30000);
        return () => { mounted = false; clearInterval(id); };
    }, []);

    React.useEffect(() => {
        const userStr = sessionStorage.getItem('iwogate_user');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }
    }, []);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const handleNavigate = (path) => {
        setIsMenuOpen(false);
        navigate(path);
    };

    const handleLogout = () => {
        if (confirm("Apakah Anda yakin ingin keluar?")) {
            sessionStorage.removeItem('iwogate_user');
            navigate('/login');
        }
    };

    const canAccessSettings = currentUser?.role === 'admin' || currentUser?.role === 'superuser';

    return (
        <header className="app-header">
            <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                <div className="logo-icon">i</div>
                <h1 className="app-name">iwogate</h1>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ position: 'relative' }}>
                    <button className="menu-btn" onClick={() => setNotifOpen(!notifOpen)} aria-label="Notifikasi">
                        <Bell size={20} />
                        {unreadCount > 0 && <span className="notif-badge-small">{unreadCount}</span>}
                    </button>
                    {notifOpen && (
                        <div className="notif-dropdown">
                            <div className="notif-header">
                                <strong>Notifikasi</strong>
                                <button onClick={() => setNotifOpen(false)}><X size={16} /></button>
                            </div>
                            <div className="notif-body">
                                {notifications.length === 0 ? (
                                    <div className="p-2">Tidak ada notifikasi</div>
                                ) : (
                                    notifications.slice(0,5).map(n => (
                                        <div key={n.id} className={`notif-entry ${n.is_read ? 'read' : 'unread'}`}>
                                            <div className="notif-msg">{n.message}</div>
                                            <div className="notif-meta"><small>{new Date(n.created_at).toLocaleString()}</small></div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ position: 'relative' }}>
                <button className="menu-btn" onClick={toggleMenu}>
                    <Menu size={24} />
                </button>

                {isMenuOpen && (
                    <>
                        <div className="menu-backdrop" onClick={() => setIsMenuOpen(false)}></div>
                        <div className="dropdown-menu animate-fade-in">
                            <button onClick={() => handleNavigate('/profile')} className="dropdown-item">
                                <User size={18} /> Profil Saya
                            </button>
                            {canAccessSettings && (
                                <button onClick={() => handleNavigate('/settings')} className="dropdown-item">
                                    <Users size={18} /> Pengaturan User
                                </button>
                            )}
                            <div className="dropdown-divider"></div>
                            <button onClick={handleLogout} className="dropdown-item text-red-600">
                                <LogOut size={18} /> Keluar
                            </button>
                        </div>
                    </>
                )}
            </div>
        </header>
    );
};

const Layout = ({ children }) => {
    return (
        <div className="app-container">
            <Header />
            <main className="app-content">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    {children}
                </motion.div>
            </main>
            <MobileNav />
        </div>
    );
};

export default Layout;
