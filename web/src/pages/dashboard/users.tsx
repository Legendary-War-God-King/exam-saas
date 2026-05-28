import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import api from '@/lib/api';

interface User {
  id: string; name: string; email: string; role: string;
  mustChangePassword: boolean; disabledAt: string | null; createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const fetchUsers = () => {
    api.get('/tenant/users', { params: { page, limit: 20, search: search || undefined, role: role || undefined } })
      .then((r) => { setUsers(r.data.data); setTotal(r.data.total); });
  };

  useEffect(() => { fetchUsers(); }, [page, search, role]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/tenant/users', { name: newName, email: newEmail });
    alert(`创建成功！临时密码: ${res.data.tempPassword}`);
    setShowCreate(false);
    setNewName('');
    setNewEmail('');
    fetchUsers();
  };

  const handleToggle = async (id: string, action: 'enable' | 'disable') => {
    await api.patch(`/tenant/users/${id}`, { action });
    fetchUsers();
  };

  return (
    <ProtectedRoute>
      <Layout title="用户管理">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between mb-4">
            <div className="flex gap-2">
              <input placeholder="搜索姓名/邮箱" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="border rounded px-3 py-1.5 text-sm w-48" />
              <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}
                className="border rounded px-3 py-1.5 text-sm">
                <option value="">全部角色</option>
                <option value="ADMIN">管理员</option>
                <option value="TEACHER">教师</option>
              </select>
            </div>
            <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">
              创建教师
            </button>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">姓名</th><th className="pb-2">邮箱</th><th className="pb-2">角色</th><th className="pb-2">状态</th><th className="pb-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-2">{u.name}</td>
                  <td className="py-2 text-gray-500">{u.email}</td>
                  <td className="py-2">{u.role === 'ADMIN' ? '管理员' : '教师'}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.disabledAt ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {u.disabledAt ? '已禁用' : '正常'}
                    </span>
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => handleToggle(u.id, u.disabledAt ? 'enable' : 'disable')}
                      className={`text-xs px-2 py-0.5 rounded ${u.disabledAt ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'}`}
                    >
                      {u.disabledAt ? '启用' : '禁用'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {total > 20 && (
            <div className="flex justify-center gap-2 mt-4">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-30">上一页</button>
              <span className="px-3 py-1 text-sm text-gray-500">第 {page} 页 / 共 {Math.ceil(total / 20)} 页</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total}
                className="px-3 py-1 border rounded text-sm disabled:opacity-30">下一页</button>
            </div>
          )}
        </div>

        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="创建教师">
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">姓名</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm" required />
            </div>
            <div>
              <label className="block text-sm mb-1">邮箱</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm" required />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700">创建</button>
          </form>
        </Modal>
      </Layout>
    </ProtectedRoute>
  );
}
