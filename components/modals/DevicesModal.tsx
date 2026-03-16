import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeft, Smartphone, Monitor, Trash2, MapPin, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { ToastType } from '../Toast';

const MDiv = motion.div as any;

interface Device {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string;
  device_type: string;
  last_active: string;
  ip_address?: string;
  location?: string;
  user_agent?: string;
  is_current: boolean;
  created_at: string;
}

interface DevicesModalProps {
  onClose: () => void;
  userId: string;
  showToast: (msg: string, type: ToastType) => void;
}

export const DevicesModal: React.FC<DevicesModalProps> = ({ onClose, userId, showToast }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const currentDeviceId = localStorage.getItem('vellor_device_id');

  useEffect(() => {
    fetchDevices();
    
    // Небольшая задержка перед подпиской для стабильности
    const timer = setTimeout(() => {
      // Realtime subscription for devices
      const channel = supabase
        .channel(`devices_realtime_${userId}`, {
          config: {
            broadcast: { self: true },
            presence: { key: userId }
          }
        })
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'user_devices', filter: `user_id=eq.${userId}` },
          (payload) => {
            console.log('Device realtime event:', payload.eventType, payload);
            
            if (payload.eventType === 'INSERT') {
              const newDevice = payload.new as Device;
              setDevices(prev => {
                // Проверяем что устройство еще не добавлено
                if (prev.find(d => d.id === newDevice.id)) {
                  return prev;
                }
                return [newDevice, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedDevice = payload.new as Device;
              setDevices(prev => prev.map(d => d.id === updatedDevice.id ? updatedDevice : d));
            } else if (payload.eventType === 'DELETE') {
              const deletedId = (payload.old as any).id;
              setDevices(prev => prev.filter(d => d.id !== deletedId));
            }
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            // Тихо игнорируем ошибки подписки - устройства все равно загружаются из БД
            console.warn('Devices realtime subscription issue:', status);
          }
        });
      
      return () => {
        supabase.removeChannel(channel);
      };
    }, 500);
    
    return () => clearTimeout(timer);
  }, [userId]);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .order('last_active', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (e) {
      console.error('Fetch devices error:', e);
      showToast('ошибка загрузки устройств', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string, deviceDeviceId: string) => {
    // Проверяем что это не наше устройство
    const currentDeviceId = localStorage.getItem('vellor_device_id');
    if (deviceDeviceId === currentDeviceId) {
      showToast('нельзя удалить текущее устройство', 'warning');
      return;
    }

    if (!confirm('вы уверены? устройство будет отключено и потребуется повторный вход')) {
      return;
    }

    setDeletingId(deviceId);
    try {
      console.log('Removing device:', deviceId, 'device_id:', deviceDeviceId);
      
      // Удаляем устройство из базы
      const { error } = await supabase
        .from('user_devices')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;

      // Отправляем broadcast для завершения сеанса на удаленном устройстве
      await supabase.channel('device_logout').send({
        type: 'broadcast',
        event: 'force_logout',
        payload: { device_id: deviceDeviceId, user_id: userId }
      });

      showToast('устройство удалено', 'success');
    } catch (e) {
      console.error('Remove device error:', e);
      showToast('ошибка удаления устройства', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const getDeviceIcon = (type: string) => {
    if (type.includes('mobile') || type.includes('android') || type.includes('ios')) {
      return <Smartphone size={20} className="text-blue-400" />;
    }
    return <Monitor size={20} className="text-green-400" />;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} дн назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex flex-col h-full glass-panel relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
      
      {/* Header */}
      <div className="relative p-6 border-b border-white/5 flex items-center justify-between glass-panel sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 glass-panel-light rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all active:scale-90">
            <ChevronLeft size={22} />
          </button>
          <div>
            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white drop-shadow-md">устройства</h2>
            <p className="text-[9px] text-white/40 font-mono mt-0.5">{devices.length} активных</p>
          </div>
        </div>
        <button onClick={onClose} className="p-3 glass-panel-light rounded-2xl hover:bg-white/10 text-white transition-all active:scale-90 shadow-lg">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-12 h-12 border-4 border-vellor-red/30 border-t-vellor-red rounded-full animate-spin" />
            <p className="text-sm text-white/50">загрузка устройств...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="p-6 glass-panel rounded-full">
              <Smartphone size={48} className="text-white/30" />
            </div>
            <p className="text-sm text-white/50">нет активных устройств</p>
          </div>
        ) : (
          <>
            {/* Info Banner */}
            <div className="p-4 glass-panel border border-blue-500/20 rounded-2xl flex items-start gap-3">
              <AlertTriangle size={18} className="text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-white mb-1">управление сеансами</p>
                <p className="text-[10px] text-white/60 leading-relaxed">
                  здесь показаны все устройства с активным входом. удаление устройства завершит сеанс и потребует повторной авторизации
                </p>
              </div>
            </div>

            {/* Devices List */}
            {devices.map((device) => (
              <MDiv
                key={device.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative p-5 glass-panel rounded-2xl overflow-hidden group hover:glass-panel-light transition-all ${device.device_id === currentDeviceId ? 'border-2 border-green-500/30 shadow-glow-red' : 'border border-white/5'}`}
              >
                {device.device_id === currentDeviceId && (
                  <div className="absolute top-3 right-3">
                    <div className="flex items-center gap-1.5 bg-green-500/20 border border-green-500/30 rounded-full px-2 py-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[9px] font-black text-green-400 uppercase tracking-wider">текущее</span>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className="p-3 glass-panel-light rounded-xl shrink-0">
                    {getDeviceIcon(device.device_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-white mb-1 truncate flex items-center gap-2">
                      {device.device_name}
                      {device.device_id === currentDeviceId && <CheckCircle size={14} className="text-green-400" />}
                    </h3>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-[10px] text-white/50">
                        <Calendar size={10} />
                        <span>последняя активность: {formatDate(device.last_active)}</span>
                      </div>
                      
                      {device.location && (
                        <div className="flex items-center gap-2 text-[10px] text-white/50">
                          <MapPin size={10} />
                          <span>{device.location}</span>
                        </div>
                      )}
                      
                      {device.ip_address && (
                        <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono">
                          <span>IP: {device.ip_address}</span>
                        </div>
                      )}
                    </div>

                    {device.user_agent && (
                      <p className="text-[9px] text-white/30 mt-2 truncate font-mono">
                        {device.user_agent}
                      </p>
                    )}
                  </div>

                  {device.device_id !== currentDeviceId && (
                    <button
                      onClick={() => handleRemoveDevice(device.id, device.device_id)}
                      disabled={deletingId === device.id}
                      className="p-3 glass-panel-light rounded-xl text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {deletingId === device.id ? (
                        <div className="w-5 h-5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  )}
                </div>
              </MDiv>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
