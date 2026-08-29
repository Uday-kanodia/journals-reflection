import React, { useState } from 'react';
import {
  Users,
  Plus,
  Shield,
  Trash2,
  Mail,
  UserCheck,
  X,
  Sparkles,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { CollaborativeVault, VaultMember, VaultRole } from '../types';
import {
  createCollaborativeVault,
  updateVaultMembers,
  deleteCollaborativeVault,
} from '../firebase';

interface CollaborativeVaultModalProps {
  currentUser: User;
  vaults: CollaborativeVault[];
  activeVaultId: string | null;
  onSelectVault: (vaultId: string | null) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const CollaborativeVaultModal: React.FC<CollaborativeVaultModalProps> = ({
  currentUser,
  vaults,
  activeVaultId,
  onSelectVault,
  isOpen,
  onClose,
}) => {
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manage member state for selected vault
  const [managingVault, setManagingVault] = useState<CollaborativeVault | null>(null);
  const [addMemberEmail, setAddMemberEmail] = useState<string>('');
  const [addMemberRole, setAddMemberRole] = useState<'editor' | 'viewer'>('editor');

  if (!isOpen) return null;

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSaving(true);
    setErrorMsg(null);
    try {
      const initialInvites = inviteEmail.trim()
        ? [{ email: inviteEmail.trim().toLowerCase(), role: inviteRole }]
        : [];

      const vaultId = await createCollaborativeVault(
        currentUser,
        newTitle.trim(),
        newDescription.trim(),
        initialInvites
      );

      setNewTitle('');
      setNewDescription('');
      setInviteEmail('');
      setIsCreating(false);
      onSelectVault(vaultId);
      onClose();
    } catch (err: any) {
      console.error('Failed to create vault:', err);
      setErrorMsg(err?.message || 'Failed to create collaborative vault.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMemberToVault = async (vault: CollaborativeVault) => {
    if (!addMemberEmail.trim()) return;
    const cleanEmail = addMemberEmail.trim().toLowerCase();

    setSaving(true);
    try {
      const updatedMembers = { ...vault.members };
      const updatedEmails = Array.from(new Set([...vault.memberEmails, cleanEmail]));
      const key = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

      updatedMembers[key] = {
        email: cleanEmail,
        role: addMemberRole,
        addedAt: new Date().toISOString(),
      };

      await updateVaultMembers(vault.id, updatedMembers, updatedEmails);
      setAddMemberEmail('');
      setManagingVault({
        ...vault,
        members: updatedMembers,
        memberEmails: updatedEmails,
      });
    } catch (err: any) {
      console.error('Failed to add member:', err);
      setErrorMsg(err?.message || 'Failed to add member to vault.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (vault: CollaborativeVault, email: string) => {
    setSaving(true);
    try {
      const updatedMembers = { ...vault.members };
      const keyToRemove = Object.keys(updatedMembers).find(
        (k) => updatedMembers[k].email.toLowerCase() === email.toLowerCase()
      );
      if (keyToRemove) {
        delete updatedMembers[keyToRemove];
      }
      const updatedEmails = vault.memberEmails.filter(
        (e) => e.toLowerCase() !== email.toLowerCase()
      );

      await updateVaultMembers(vault.id, updatedMembers, updatedEmails);
      setManagingVault({
        ...vault,
        members: updatedMembers,
        memberEmails: updatedEmails,
      });
    } catch (err: any) {
      console.error('Failed to remove member:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVault = async (vaultId: string) => {
    if (!confirm('Are you sure you want to delete this collaborative vault and all its shared retrospectives?')) {
      return;
    }
    try {
      await deleteCollaborativeVault(vaultId);
      if (activeVaultId === vaultId) {
        onSelectVault(null);
      }
      setManagingVault(null);
    } catch (err: any) {
      console.error('Failed to delete vault:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2e2e26]/50 backdrop-blur-xs animate-in fade-in">
      <div
        id="collaborative-vaults-modal"
        className="bg-white rounded-3xl border border-[#d8d8ce] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#e0e0d8] flex items-center justify-between bg-[#fbfbf9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5A5A40] text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-[#2e2e26]">
                Collaborative Reflection Vaults
              </h2>
              <p className="text-xs text-[#8a8a7a]">
                Role-based co-authoring for mentorship pairs and creative teams
              </p>
            </div>
          </div>
          <button
            id="close-vault-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-[#8a8a7a] hover:bg-[#f0f0ea] hover:text-[#2e2e26] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-[#4a4a40]">
          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="font-bold cursor-pointer">
                ✕
              </button>
            </div>
          )}

          {/* Create Vault Form Toggle */}
          {!isCreating && !managingVault && (
            <div className="flex items-center justify-between bg-[#f7f7f3] p-4 rounded-2xl border border-[#e0e0d8]">
              <div>
                <h3 className="text-sm font-bold text-[#2e2e26]">
                  Create New Shared Vault
                </h3>
                <p className="text-xs text-[#8a8a7a] mt-0.5">
                  Start a private retrospective space for 1-on-1 mentorship or team retrospectives.
                </p>
              </div>
              <button
                id="open-create-vault-form-btn"
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 rounded-xl bg-[#5A5A40] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#4a4a35] transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" /> New Vault
              </button>
            </div>
          )}

          {/* Create Vault Form */}
          {isCreating && (
            <form
              onSubmit={handleCreateVault}
              className="bg-[#f7f7f3] p-5 rounded-2xl border border-[#5A5A40]/30 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#e8e8df] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5A5A40]">
                  Configure New Vault
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-[#8a8a7a] hover:text-[#2e2e26] cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2e2e26] mb-1">
                  Vault Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Strategy Retrospective or Mentorship Circle"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d8d8ce] bg-white text-xs text-[#2e2e26] focus:outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2e2e26] mb-1">
                  Description / Purpose (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Weekly co-authoring of strategic lessons and feedback."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d8d8ce] bg-white text-xs text-[#2e2e26] focus:outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#2e2e26] mb-1">
                    Invite Collaborator by Email (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-[#8a8a7a]" />
                    <input
                      type="email"
                      placeholder="collaborator@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#d8d8ce] bg-white text-xs text-[#2e2e26] focus:outline-none focus:border-[#5A5A40]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2e2e26] mb-1">
                    Initial Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#d8d8ce] bg-white text-xs text-[#2e2e26] focus:outline-none focus:border-[#5A5A40]"
                  >
                    <option value="editor">Editor (Co-Author)</option>
                    <option value="viewer">Viewer (Read-Only)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#727262] hover:bg-[#eaeae2] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-create-vault-btn"
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#5A5A40] text-white text-xs font-bold hover:bg-[#4a4a35] transition-colors cursor-pointer shadow-xs"
                >
                  {saving ? 'Creating...' : 'Create Vault'}
                </button>
              </div>
            </form>
          )}

          {/* Manage Vault Members Modal View */}
          {managingVault && (
            <div className="bg-[#fbfbf9] p-5 rounded-2xl border border-[#d8d8ce] space-y-4">
              <div className="flex items-center justify-between border-b border-[#e8e8df] pb-3">
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-[#8a8a7a]">
                    Managing Members
                  </span>
                  <h3 className="font-serif text-lg font-bold text-[#2e2e26]">
                    {managingVault.title}
                  </h3>
                </div>
                <button
                  onClick={() => setManagingVault(null)}
                  className="px-3 py-1.5 rounded-xl text-xs bg-[#f0f0ea] hover:bg-[#e4e4dc] text-[#5A5A40] font-bold cursor-pointer"
                >
                  Back to Vaults
                </button>
              </div>

              {/* Add Member Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="Enter colleague or mentee email..."
                  value={addMemberEmail}
                  onChange={(e) => setAddMemberEmail(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-[#d8d8ce] bg-white text-xs text-[#2e2e26] focus:outline-none focus:border-[#5A5A40]"
                />
                <select
                  value={addMemberRole}
                  onChange={(e) => setAddMemberRole(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-[#d8d8ce] bg-white text-xs text-[#2e2e26] focus:outline-none"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={() => handleAddMemberToVault(managingVault)}
                  disabled={saving || !addMemberEmail.trim()}
                  className="px-4 py-2 rounded-xl bg-[#5A5A40] text-white text-xs font-bold hover:bg-[#4a4a35] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  Add Member
                </button>
              </div>

              {/* Member List */}
              <div className="space-y-2 mt-4">
                <p className="text-xs font-bold text-[#8a8a7a]">Active Members & Access Roles</p>
                {Object.values(managingVault.members || {}).map((m, idx) => {
                  const isOwner = m.role === 'owner';
                  return (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-xl border border-[#e0e0d8] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] flex items-center justify-center text-xs font-bold">
                          {m.displayName ? m.displayName[0] : m.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#2e2e26]">
                            {m.displayName || m.email}
                          </p>
                          <p className="text-[10px] text-[#8a8a7a] font-mono">{m.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider ${
                            isOwner
                              ? 'bg-[#5A5A40] text-white'
                              : m.role === 'editor'
                              ? 'bg-[#456b3e]/10 text-[#456b3e]'
                              : 'bg-[#8a8a7a]/10 text-[#727262]'
                          }`}
                        >
                          {m.role}
                        </span>

                        {!isOwner && managingVault.ownerId === currentUser.uid && (
                          <button
                            onClick={() => handleRemoveMember(managingVault, m.email)}
                            className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {managingVault.ownerId === currentUser.uid && (
                <div className="pt-3 border-t border-[#e8e8df] flex justify-end">
                  <button
                    onClick={() => handleDeleteVault(managingVault.id)}
                    className="text-xs text-rose-700 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Entire Vault
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Vaults List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8a8a7a]">
                Your Active Vaults ({vaults.length})
              </h3>
            </div>

            {vaults.length === 0 ? (
              <div className="p-8 text-center bg-[#f7f7f3] rounded-2xl border border-dashed border-[#d8d8ce]">
                <Users className="w-8 h-8 text-[#a0a090] mx-auto mb-2" />
                <p className="text-xs font-bold text-[#2e2e26]">No collaborative vaults yet</p>
                <p className="text-[11px] text-[#8a8a7a] mt-1">
                  Create a vault to co-author strategic retrospectives with peers or mentors.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {vaults.map((vault) => {
                  const isActive = vault.id === activeVaultId;
                  const isOwner = vault.ownerId === currentUser.uid;
                  const memberCount = Object.keys(vault.members || {}).length;

                  return (
                    <div
                      key={vault.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-[#5A5A40]/10 border-[#5A5A40]'
                          : 'bg-white hover:bg-[#fbfbf9] border-[#e0e0d8]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#2e2e26]">{vault.title}</h4>
                          {isOwner ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#5A5A40] text-white text-[9px] font-bold uppercase tracking-wider">
                              Owner
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-[#456b3e]/10 text-[#456b3e] text-[9px] font-bold uppercase tracking-wider">
                              Collaborator
                            </span>
                          )}
                        </div>
                        {vault.description && (
                          <p className="text-xs text-[#8a8a7a] mt-0.5 line-clamp-1">
                            {vault.description}
                          </p>
                        )}
                        <p className="text-[10px] text-[#a0a090] mt-1 flex items-center gap-2">
                          <span>{memberCount} member{memberCount === 1 ? '' : 's'}</span>
                          <span>•</span>
                          <span>Created {new Date(vault.createdAt).toLocaleDateString()}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => setManagingVault(vault)}
                          className="px-3 py-1.5 rounded-xl border border-[#d8d8ce] text-xs font-bold text-[#5A5A40] hover:bg-[#f0f0ea] transition-colors cursor-pointer"
                        >
                          Members ({memberCount})
                        </button>

                        <button
                          id={`select-vault-${vault.id}`}
                          onClick={() => {
                            onSelectVault(vault.id);
                            onClose();
                          }}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs ${
                            isActive
                              ? 'bg-[#5A5A40] text-white'
                              : 'bg-[#f0f0ea] hover:bg-[#5A5A40] hover:text-white text-[#2e2e26]'
                          }`}
                        >
                          {isActive ? 'Active Space' : 'Enter Vault'}
                          {!isActive && <ArrowRight className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#e0e0d8] bg-[#fbfbf9] flex items-center justify-between">
          <button
            onClick={() => {
              onSelectVault(null);
              onClose();
            }}
            className="text-xs font-bold text-[#5A5A40] hover:underline cursor-pointer flex items-center gap-1"
          >
            ← Switch back to Personal Journal
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#5A5A40] text-white text-xs font-bold hover:bg-[#4a4a35] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
