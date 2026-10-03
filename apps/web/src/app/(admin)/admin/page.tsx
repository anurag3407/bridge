'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import {
  BridgeSummary,
  UserProfile,
  AuditEvent,
  CreateBridgeRequest,
} from '@bridge/contracts';
import {
  Shield,
  Layers,
  Users,
  FileText,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Globe,
  Archive,
} from 'lucide-react';

export default function AdminConsolePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'bridges' | 'users' | 'audit'>('bridges');

  // Queries
  const { data: bridges, isLoading: isBridgesLoading } = useQuery<BridgeSummary[]>({
    queryKey: ['admin', 'bridges'],
    queryFn: () => apiClient.getMyBridges(),
  });

  const { data: users, isLoading: isUsersLoading } = useQuery<UserProfile[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => apiClient.listUsers(),
  });

  const { data: auditLogs, isLoading: isAuditLoading } = useQuery<AuditEvent[]>({
    queryKey: ['admin', 'audit'],
    queryFn: () => apiClient.getAuditLogs(),
  });

  // State for Create Bridge Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // State for Assign Operator
  const [selectedBridgeId, setSelectedBridgeId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  // Create Bridge Mutation
  const createBridgeMutation = useMutation({
    mutationFn: async (data: CreateBridgeRequest) => apiClient.createBridge(data),
    onSuccess: () => {
      setShowCreateModal(false);
      setNewSlug('');
      setNewName('');
      setNewDesc('');
      setNewLocation('');
      setCreateError(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'bridges'] });
    },
    onError: (err: any) => setCreateError(err.message),
  });

  // Lifecycle Update Mutation
  const updateLifecycleMutation = useMutation({
    mutationFn: async ({ bridgeId, lifecycle }: { bridgeId: string; lifecycle: 'draft' | 'published' | 'retired' }) =>
      apiClient.updateBridge(bridgeId, { lifecycle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bridges'] });
      queryClient.invalidateQueries({ queryKey: ['bridges'] });
    },
  });

  // Assign Operator Mutation
  const assignMutation = useMutation({
    mutationFn: async () => apiClient.assignOperator(selectedBridgeId, selectedUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'bridges'] });
    },
  });

  // Revoke Operator Mutation
  const revokeMutation = useMutation({
    mutationFn: async ({ bridgeId, userId }: { bridgeId: string; userId: string }) =>
      apiClient.revokeOperator(bridgeId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'bridges'] });
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-800/60 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Super Admin Operations</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Platform Control Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage bridge lifecycle publications, operator assignments, and immutable security audit trails.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition shadow-lg shadow-sky-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Bridge</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('bridges')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'bridges'
              ? 'bg-slate-800 text-sky-400'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Bridges & Lifecycles</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'users'
              ? 'bg-slate-800 text-sky-400'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Operators & Assignments</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'audit'
              ? 'bg-slate-800 text-sky-400'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Security Audit Trail</span>
        </button>
      </div>

      {/* TAB 1: BRIDGES */}
      {activeTab === 'bridges' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">All Platform Bridges</h2>
            <span className="text-xs text-slate-400 font-mono">
              Total: {bridges?.length || 0}
            </span>
          </div>

          {isBridgesLoading ? (
            <div className="py-12 text-center text-slate-400">Loading bridges...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-3">Display Name & Slug</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Condition</th>
                    <th className="py-3 px-3">Lifecycle State</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {bridges?.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-white text-sm">{b.displayName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">/bridges/{b.slug}</div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-400">{b.locationLabel || '—'}</td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            b.currentCondition === 'NORMAL'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : b.currentCondition === 'BROKEN'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : b.currentCondition === 'DANGER'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {b.currentCondition}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            b.lifecycle === 'published'
                              ? 'bg-sky-950 text-sky-300 border border-sky-800'
                              : b.lifecycle === 'draft'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {b.lifecycle}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        {b.lifecycle !== 'published' && (
                          <button
                            onClick={() =>
                              updateLifecycleMutation.mutate({ bridgeId: b.id, lifecycle: 'published' })
                            }
                            className="px-2.5 py-1 rounded bg-sky-900/60 hover:bg-sky-800 text-sky-200 border border-sky-700 text-[11px] font-medium transition"
                          >
                            Publish
                          </button>
                        )}
                        {b.lifecycle === 'published' && (
                          <button
                            onClick={() =>
                              updateLifecycleMutation.mutate({ bridgeId: b.id, lifecycle: 'draft' })
                            }
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium transition"
                          >
                            Unpublish
                          </button>
                        )}
                        {b.lifecycle !== 'retired' && (
                          <button
                            onClick={() =>
                              updateLifecycleMutation.mutate({ bridgeId: b.id, lifecycle: 'retired' })
                            }
                            className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[11px] font-medium transition"
                          >
                            Retire
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OPERATORS & ASSIGNMENTS */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Assignment Control Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white">Assign Operator to Bridge Sector</h2>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full sm:w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                <option value="">Select Operator Account...</option>
                {users
                  ?.filter((u) => u.accountStatus === 'active')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} ({u.email})
                    </option>
                  ))}
              </select>

              <select
                value={selectedBridgeId}
                onChange={(e) => setSelectedBridgeId(e.target.value)}
                className="w-full sm:w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                <option value="">Select Bridge Target...</option>
                {bridges?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.displayName} ({b.slug})
                  </option>
                ))}
              </select>

              <button
                disabled={!selectedUserId || !selectedBridgeId || assignMutation.isPending}
                onClick={() => assignMutation.mutate()}
                className="w-full sm:w-auto px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-sm transition whitespace-nowrap"
              >
                Assign
              </button>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-4">Platform User Profiles</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-3">User</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Roles</th>
                    <th className="py-3 px-3">Assigned Bridges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {users?.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-white">{u.displayName}</div>
                        <div className="text-[11px] text-slate-500">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.accountStatus === 'active'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {u.accountStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono">
                        {u.roles.length > 0 ? u.roles.join(', ') : 'operator'}
                      </td>
                      <td className="py-3.5 px-3">
                        {u.assignedBridgeIds.length === 0 ? (
                          <span className="text-slate-500 italic">None</span>
                        ) : (
                          <div className="space-y-1">
                            {u.assignedBridgeIds.map((bId) => {
                              const b = bridges?.find((br) => br.id === bId);
                              return (
                                <div key={bId} className="flex items-center space-x-2">
                                  <span className="text-slate-300 font-medium">
                                    {b ? b.displayName : bId.substring(0, 8)}
                                  </span>
                                  <button
                                    onClick={() => revokeMutation.mutate({ bridgeId: bId, userId: u.id })}
                                    className="text-rose-400 hover:text-rose-300 p-0.5"
                                    title="Revoke assignment"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Security & Operational Audit Log</h2>
            <span className="text-xs text-slate-400 font-mono">Total Events: {auditLogs?.length || 0}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Entity Type & ID</th>
                  <th className="py-3 px-3">Outcome</th>
                  <th className="py-3 px-3">Request ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                {auditLogs?.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-sky-400">{log.action}</td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {log.entityType} ({log.entityId.substring(0, 8)})
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          log.outcome === 'success'
                            ? 'bg-emerald-950 text-emerald-300'
                            : 'bg-rose-950 text-rose-300'
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{log.requestId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Bridge Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create New Bridge</h3>

            {createError && (
              <div className="p-3 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 text-xs">
                {createError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Slug (URL identifier)</label>
                <input
                  type="text"
                  placeholder="e.g. golden-reach-viaduct"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Golden Reach Viaduct"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Location Label</label>
                <input
                  type="text"
                  placeholder="e.g. State Route 101, Mile 12"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Technical and operational overview..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={!newSlug || !newName || createBridgeMutation.isPending}
                onClick={() =>
                  createBridgeMutation.mutate({
                    slug: newSlug,
                    displayName: newName,
                    description: newDesc || undefined,
                    locationLabel: newLocation || undefined,
                  })
                }
                className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold"
              >
                {createBridgeMutation.isPending ? 'Creating...' : 'Create Bridge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
