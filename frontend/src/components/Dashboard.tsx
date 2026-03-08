import { LogOut } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Service } from "../types";
import ServiceDetail from "./ServiceDetail";
import ServiceFormModal from "./ServiceFormModal";
import ServiceList from "./ServiceList";
import SummaryCards from "./SummaryCards";
import AiSummary from "./AiSummary";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const openAddModal = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
  };

  const handleSaved = (saved: Service) => {
    // If we just edited the currently-selected service, sync its data
    if (selectedService && saved.id === selectedService.id) {
      setSelectedService(saved);
    }
    closeModal();
  };

  const handleDeleted = () => {
    setSelectedService(null);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col text-white">
      {/* Top bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">SR</span>
          </div>
          <h1 className="text-sm font-semibold text-white tracking-tight">
            Service Reliability Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 font-medium">
            {user?.username}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={13} />
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main panel */}
        <main className="flex-1 overflow-y-auto p-6 space-y-5 min-w-0">
          <SummaryCards />
          <AiSummary />
          <ServiceList
            selectedId={selectedService?.id ?? null}
            onSelect={setSelectedService}
            onAdd={openAddModal}
          />
        </main>

        {/* Detail side panel */}
        {selectedService && (
          <ServiceDetail
            service={selectedService}
            onEdit={openEditModal}
            onDelete={handleDeleted}
            onClose={() => setSelectedService(null)}
          />
        )}
      </div>

      {/* Add / Edit modal */}
      {isModalOpen && (
        <ServiceFormModal
          service={editingService}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
