import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Phone,
  Lock,
  Flame,
  Zap,
  Edit2,
  Trash2,
  Share2,
  Plus,
  RefreshCw,
  LogOut,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import { api, UserProfile, offlineStorage } from '../services/api';

interface ProfileScreenProps {
  profile: UserProfile | null;
  onProfileUpdated: () => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  profile,
  onProfileUpdated,
  onLogout,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'OVERVIEW' | 'PRIVACY' | 'SAFETY'>('OVERVIEW');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [firstName, setFirstName] = useState(profile?.firstName || '');
  const [lastName, setLastName] = useState(profile?.lastName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [weeklyGoalKm, setWeeklyGoalKm] = useState(profile?.weeklyGoalKm?.toString() || '20');

  // Privacy
  const [privacySettings, setPrivacySettings] = useState<any>(null);
  const [privacyZones, setPrivacyZones] = useState<any[]>([]);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneRadius, setNewZoneRadius] = useState('500');

  // Safety
  const [safetyContacts, setSafetyContacts] = useState<any[]>([]);
  const [activeShareToken, setActiveShareToken] = useState<string | null>(null);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // Offline Sync Queue
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    loadPrivacyAndSafety();
    checkOfflineQueue();
  }, []);

  const checkOfflineQueue = () => {
    const q = offlineStorage.getQueue();
    setOfflineCount(q.length);
  };

  const handleSyncOffline = async () => {
    const q = offlineStorage.getQueue();
    if (q.length === 0) return;
    setIsSyncing(true);
    try {
      await api.syncOfflineActivities(q);
      offlineStorage.clear();
      setOfflineCount(0);
      alert('Offline activities synchronized successfully!');
      onProfileUpdated();
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadPrivacyAndSafety = async () => {
    try {
      const pRes = await api.getPrivacySettings();
      setPrivacySettings(pRes.settings);
      setPrivacyZones(pRes.zones || []);

      const sRes = await api.getSafetyOverview();
      setSafetyContacts(sRes.contacts || []);
      setActiveShareToken(sRes.activeShareToken);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await api.updateProfile({
        firstName,
        lastName,
        bio,
        weeklyGoalKm: parseFloat(weeklyGoalKm) || 20,
      });
      setIsEditingProfile(false);
      onProfileUpdated();
    } catch (e: any) {
      alert(e.message || 'Failed to update profile');
    }
  };

  const handleUpdatePrivacy = async (key: string, val: any) => {
    try {
      const res = await api.updatePrivacySettings({ [key]: val });
      setPrivacySettings(res.settings);
    } catch (e: any) {
      alert(e.message || 'Failed to update privacy');
    }
  };

  const handleAddPrivacyZone = async () => {
    if (!newZoneName) return;
    try {
      // Default to approximate current center or SF demo coordinate
      await api.addPrivacyZone({
        name: newZoneName,
        latitude: 37.7749,
        longitude: -122.4194,
        radiusMeters: parseInt(newZoneRadius, 10) || 500,
      });
      setNewZoneName('');
      loadPrivacyAndSafety();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeletePrivacyZone = async (id: string) => {
    try {
      await api.deletePrivacyZone(id);
      loadPrivacyAndSafety();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddSafetyContact = async () => {
    if (!newContactName || !newContactPhone) return;
    try {
      await api.addSafetyContact({
        name: newContactName,
        phone: newContactPhone,
        relationship: 'Emergency Contact',
      });
      setNewContactName('');
      setNewContactPhone('');
      loadPrivacyAndSafety();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteSafetyContact = async (id: string) => {
    try {
      await api.deleteSafetyContact(id);
      loadPrivacyAndSafety();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleGenerateLiveShare = async () => {
    try {
      const res = await api.generateLiveShare({ durationHours: 4 });
      setActiveShareToken(res.shareToken);
      const fullUrl = `${window.location.origin}${res.shareUrl}`;
      navigator.clipboard?.writeText(fullUrl);
      alert(`Temporary live safety tracking link copied to clipboard!\n\n${fullUrl}`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('WARNING: Are you sure you want to permanently delete your STRIDE account and all recorded activity data? This action is irreversible.')) {
      try {
        await api.deleteAccount();
        onLogout();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  return (
    <div style={{ padding: '20px 18px 110px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Athlete Profile Card */}
      <div
        className="stride-card"
        style={{
          background: 'linear-gradient(145deg, var(--bg-card), var(--bg-surface))',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-elevated)',
              overflow: 'hidden',
              border: '2px solid var(--accent-yellow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={32} color="var(--accent-yellow)" />
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>
                {profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : 'Athlete'}
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: 'var(--accent-yellow)',
                  color: 'var(--accent-yellow-text)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                LVL {profile?.level || 1}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {profile?.bio || 'Ready to break personal records with STRIDE.'}
            </p>
          </div>

          <button
            onClick={() => setIsEditingProfile(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
            title="Edit Profile"
          >
            <Edit2 size={18} />
          </button>
        </div>

        {/* Level XP Bar */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>XP Progression</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-yellow)' }}>
              {profile?.xp || 0} XP
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, ((profile?.xp || 0) % 200) / 2)}%`,
                height: '100%',
                background: 'var(--accent-yellow)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation: Overview, Privacy, Safety */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          padding: '4px',
          borderRadius: 'var(--radius-lg)',
          gap: '4px',
        }}
      >
        <button
          onClick={() => setActiveSubTab('OVERVIEW')}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeSubTab === 'OVERVIEW' ? 'var(--accent-yellow)' : 'transparent',
            color: activeSubTab === 'OVERVIEW' ? 'var(--accent-yellow-text)' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Overview
        </button>

        <button
          onClick={() => setActiveSubTab('PRIVACY')}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeSubTab === 'PRIVACY' ? 'var(--accent-yellow)' : 'transparent',
            color: activeSubTab === 'PRIVACY' ? 'var(--accent-yellow-text)' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Privacy
        </button>

        <button
          onClick={() => setActiveSubTab('SAFETY')}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeSubTab === 'SAFETY' ? 'var(--accent-yellow)' : 'transparent',
            color: activeSubTab === 'SAFETY' ? 'var(--accent-yellow-text)' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Safety Hub
        </button>
      </div>

      {/* OVERVIEW SUB-TAB */}
      {activeSubTab === 'OVERVIEW' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Offline Sync Card */}
          <div className="stride-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Offline Storage & Sync</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {offlineCount > 0
                    ? `${offlineCount} un-synced activity recorded offline.`
                    : 'All activities fully synchronized with backend.'}
                </p>
              </div>

              {offlineCount > 0 && (
                <button
                  className="btn btn-primary"
                  onClick={handleSyncOffline}
                  disabled={isSyncing}
                  style={{ padding: '8px 14px', fontSize: '12px' }}
                >
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                  Sync Now
                </button>
              )}
            </div>
          </div>

          {/* Account Actions */}
          <div className="stride-card" style={{ padding: '8px 16px' }}>
            <button
              onClick={onLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 0',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <LogOut size={18} color="var(--text-muted)" />
              Sign Out of STRIDE
            </button>

            <button
              onClick={handleDeleteAccount}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 0',
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Trash2 size={18} />
              Delete Account & Athlete Data
            </button>
          </div>
        </div>
      )}

      {/* PRIVACY SUB-TAB */}
      {activeSubTab === 'PRIVACY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Start/End Masking Radius */}
          <div className="stride-card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Start & Finish Masking</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
              Automatically hide GPS points within this distance of where your activities start and end.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              {[0, 200, 500, 1000].map((radius) => (
                <button
                  key={radius}
                  onClick={() => handleUpdatePrivacy('hideStartEndRadiusM', radius)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    backgroundColor:
                      privacySettings?.hideStartEndRadiusM === radius
                        ? 'var(--accent-yellow)'
                        : 'var(--bg-elevated)',
                    color:
                      privacySettings?.hideStartEndRadiusM === radius
                        ? 'var(--accent-yellow-text)'
                        : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {radius === 0 ? 'Off' : `${radius}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Privacy Zones */}
          <div className="stride-card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Custom Privacy Zones</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Completely hide GPS traces near Home, Campus, or Workplace.
            </p>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {privacyZones.map((zone) => (
                <div
                  key={zone.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} color="var(--accent-yellow)" />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{zone.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{zone.radiusMeters}m radius</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePrivacyZone(zone.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Zone */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <input
                type="text"
                placeholder="Zone Name (e.g. Home)"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                className="btn btn-primary"
                onClick={handleAddPrivacyZone}
                style={{ padding: '10px 16px', fontSize: '13px' }}
              >
                Add Zone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAFETY SUB-TAB */}
      {activeSubTab === 'SAFETY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Live Location Sharing Card */}
          <div className="stride-card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Live Location Sharing</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
              Generate a temporary, secure live tracking link to send to trusted friends or family during long trail runs or late night strides.
            </p>

            <button
              className="btn btn-primary"
              onClick={handleGenerateLiveShare}
              style={{ marginTop: '14px', width: '100%', padding: '12px', fontSize: '14px' }}
            >
              <Share2 size={16} />
              {activeShareToken ? 'Copy Active Share Link' : 'Generate Live Tracking Link'}
            </button>
          </div>

          {/* Emergency Contacts */}
          <div className="stride-card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Emergency Contacts</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Contacts to notify in case of safety alerts.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {safetyContacts.map((contact) => (
                <div
                  key={contact.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{contact.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{contact.phone}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteSafetyContact(contact.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Contact */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
              <input
                type="text"
                placeholder="Contact Name"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAddSafetyContact}
                  style={{ padding: '10px 16px', fontSize: '13px' }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2500,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="stride-card"
            style={{ width: '100%', maxWidth: '420px', backgroundColor: 'var(--bg-surface)', padding: '24px' }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Edit Athlete Profile</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>FIRST NAME</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    marginTop: '4px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>LAST NAME</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    marginTop: '4px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>BIO</label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    marginTop: '4px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>WEEKLY DISTANCE GOAL (KM)</label>
                <input
                  type="number"
                  value={weeklyGoalKm}
                  onChange={(e) => setWeeklyGoalKm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    marginTop: '4px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsEditingProfile(false)}
                  style={{ flex: 1, padding: '12px' }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveProfile}
                  style={{ flex: 1, padding: '12px' }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
