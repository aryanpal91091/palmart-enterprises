import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api.js';
import {
  UsersRound,
  Plus,
  Trash2,
  Clock,
  UserCheck,
  CalendarDays,
  FileCheck,
} from 'lucide-react';

export default function Employees() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'STAFF' | 'ATTENDANCE' | 'LEAVES'>('STAFF');
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CASHIER');

  // Attendance states
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [markEmpId, setMarkEmpId] = useState('');
  const [markType, setMarkType] = useState('CHECK_IN');

  // 1. Queries
  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['staffList'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data;
    },
  });

  const { data: attendData, isLoading: attendLoading } = useQuery({
    queryKey: ['attendanceList'],
    queryFn: async () => {
      const res = await api.get('/employees/attendance');
      return res.data;
    },
  });

  const { data: leavesData, isLoading: leavesLoading } = useQuery({
    queryKey: ['leavesList'],
    queryFn: async () => {
      const res = await api.get('/employees/leaves');
      return res.data;
    },
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/employees', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to create employee account');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
    },
  });

  const attendMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/employees/attendance/mark', payload);
    },
    onSuccess: () => {
      alert('Attendance log registered successfully');
      queryClient.invalidateQueries({ queryKey: ['attendanceList'] });
      setShowAttendanceModal(false);
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to log attendance');
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) => {
      return api.put(`/employees/leaves/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leavesList'] });
    },
  });

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('CASHIER');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name, email, password, role });
  };

  const handleAttendanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attendMutation.mutate({ employeeId: markEmpId || undefined, type: markType });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees & HR Controls</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage accounts, record clock-in attendance sheets, and review leaves.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAttendanceModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-zinc-700 hover:border-brand-500 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 bg-white dark:bg-zinc-900 shadow-sm"
          >
            <Clock size={14} /> Log Clock-In/Out
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-lg"
          >
            <Plus size={14} /> Add Employee
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-zinc-800 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('STAFF')}
          className={`pb-3 flex items-center gap-1.5 ${
            activeTab === 'STAFF'
              ? 'border-b-2 border-brand-500 text-brand-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <UsersRound size={16} /> Staff Members
        </button>
        <button
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`pb-3 flex items-center gap-1.5 ${
            activeTab === 'ATTENDANCE'
              ? 'border-b-2 border-brand-500 text-brand-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserCheck size={16} /> Daily Attendance
        </button>
        <button
          onClick={() => setActiveTab('LEAVES')}
          className={`pb-3 flex items-center gap-1.5 ${
            activeTab === 'LEAVES'
              ? 'border-b-2 border-brand-500 text-brand-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarDays size={16} /> Leave Applications
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'STAFF' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-400 font-semibold bg-gray-50/50 dark:bg-zinc-800/20 font-sans">
                  <th className="py-4 px-6">Employee Name</th>
                  <th className="py-4 px-6">Email Address</th>
                  <th className="py-4 px-6">Role Security</th>
                  <th className="py-4 px-6">Joined Date</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffLoading ? (
                  [...Array(2)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-150 animate-pulse">
                      <td colSpan={6} className="py-6 px-6 bg-gray-100/10" />
                    </tr>
                  ))
                ) : staffData?.employees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      No registered employees in store.
                    </td>
                  </tr>
                ) : (
                  staffData?.employees.map((emp: any) => (
                    <tr key={emp.id} className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 text-xs">
                      <td className="py-4 px-6 font-bold text-gray-800 dark:text-gray-200">{emp.name}</td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300 font-medium">{emp.email}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                          emp.role === 'ADMIN'
                            ? 'bg-red-500/10 text-red-600'
                            : emp.role === 'MANAGER'
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'bg-zinc-500/10 text-zinc-500'
                        }`}>
                          {emp.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-400">{new Date(emp.createdAt).toLocaleDateString()}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          emp.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {emp.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to disable this employee account?')) {
                              deleteMutation.mutate(emp.id);
                            }
                          }}
                          className="p-1.5 border border-gray-200 dark:border-zinc-700 hover:border-red-500 hover:text-red-500 rounded-lg text-gray-500"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ATTENDANCE' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-400 font-semibold bg-gray-50/50 dark:bg-zinc-800/20 font-sans">
                  <th className="py-4 px-6">Employee</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Check In</th>
                  <th className="py-4 px-6">Check Out</th>
                  <th className="py-4 px-6">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendLoading ? (
                  [...Array(2)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-150 animate-pulse">
                      <td colSpan={5} className="py-6 px-6 bg-gray-100/10" />
                    </tr>
                  ))
                ) : attendData?.attendance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">
                      No attendance sheets recorded.
                    </td>
                  </tr>
                ) : (
                  attendData?.attendance.map((att: any) => (
                    <tr key={att.id} className="border-b border-gray-100 dark:border-zinc-800/50 text-xs">
                      <td className="py-4 px-6 font-bold">{att.employee.name}</td>
                      <td className="py-4 px-6 font-medium text-gray-500">{new Date(att.date).toLocaleDateString()}</td>
                      <td className="py-4 px-6 text-emerald-500 font-bold">{new Date(att.checkIn).toLocaleTimeString()}</td>
                      <td className="py-4 px-6 text-gray-500 font-bold">
                        {att.checkOut ? new Date(att.checkOut).toLocaleTimeString() : 'Active shift'}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-500/10 text-brand-500">
                          {att.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'LEAVES' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-400 font-semibold bg-gray-50/50 dark:bg-zinc-800/20 font-sans">
                  <th className="py-4 px-6">Employee</th>
                  <th className="py-4 px-6">Dates Range</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6">Reason / Notes</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-center">Fulfill Actions</th>
                </tr>
              </thead>
              <tbody>
                {leavesLoading ? (
                  [...Array(2)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-150 animate-pulse">
                      <td colSpan={6} className="py-6 px-6 bg-gray-100/10" />
                    </tr>
                  ))
                ) : leavesData?.leaves.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      No leave request logs found.
                    </td>
                  </tr>
                ) : (
                  leavesData?.leaves.map((leave: any) => (
                    <tr key={leave.id} className="border-b border-gray-100 dark:border-zinc-800/50 text-xs">
                      <td className="py-4 px-6 font-bold">{leave.employee.name}</td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-400">
                        {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 uppercase font-bold text-gray-500">{leave.type}</td>
                      <td className="py-4 px-6 text-gray-500 italic max-w-xs truncate">{leave.reason}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          leave.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : leave.status === 'REJECTED'
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {leave.status === 'PENDING' ? (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => leaveMutation.mutate({ id: leave.id, status: 'APPROVED' })}
                              className="px-2 py-1 bg-emerald-500 text-white rounded text-[10px] font-semibold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => leaveMutation.mutate({ id: leave.id, status: 'REJECTED' })}
                              className="px-2 py-1 bg-red-500 text-white rounded text-[10px] font-semibold"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employee Add Account Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl w-full max-w-sm">
            <h3 className="text-base font-bold mb-4">Provision Employee Account</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Employee Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Corporate Email</label>
                <input
                  type="email"
                  placeholder="employee@palmart.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Security Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                >
                  <option value="CASHIER">Cashier (POS Checkout only)</option>
                  <option value="MANAGER">Manager (POS + Stock adjusts)</option>
                  <option value="ADMIN">Admin (Full Access controls)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800/50">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-zinc-800 rounded-xl text-xs font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  {createMutation.isPending ? 'Provisioning...' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Clock-in/Clock-out Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl w-full max-w-sm">
            <h3 className="text-base font-bold mb-4">Register Attendance Punch</h3>
            <form onSubmit={handleAttendanceSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Employee Account</label>
                <select
                  value={markEmpId}
                  onChange={(e) => setMarkEmpId(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                >
                  <option value="">Clock-in Myself</option>
                  {staffData?.employees.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Punch Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMarkType('CHECK_IN')}
                    className={`py-2 border rounded-xl text-xs font-semibold ${
                      markType === 'CHECK_IN'
                        ? 'bg-brand-500 border-brand-500 text-white'
                        : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-500'
                    }`}
                  >
                    Check In (Morning)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarkType('CHECK_OUT')}
                    className={`py-2 border rounded-xl text-xs font-semibold ${
                      markType === 'CHECK_OUT'
                        ? 'bg-brand-500 border-brand-500 text-white'
                        : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-500'
                    }`}
                  >
                    Check Out (Evening)
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800/50">
                <button
                  type="button"
                  onClick={() => setShowAttendanceModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-zinc-800 rounded-xl text-xs font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={attendMutation.isPending}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  Log Time Punch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
