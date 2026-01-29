import { useEffect, useState } from 'react';
import type { ExceptionEvent } from '../domain/exceptionsStore';
import { type Ministry, type ScheduleEvent, type EventType } from '../domain/scheduleGenerator';

interface EditEventDrawerProps {
  isOpen: boolean;
  date: string | null;
  event?: ScheduleEvent;
  hasException?: boolean;
  ministries: Ministry[];
  onClose: () => void;
  onSave: (payload: ExceptionEvent) => void;
  onRemove: (date: string) => void;
}

const EditEventDrawer = ({
  isOpen,
  date,
  event,
  hasException,
  ministries,
  onClose,
  onSave,
  onRemove,
}: EditEventDrawerProps) => {
  const [ministry, setMinistry] = useState(event?.ministryName ?? '');
  const [type, setType] = useState<EventType>(event?.type ?? 'extra');
  const [note, setNote] = useState(event?.note ?? '');

  useEffect(() => {
    setMinistry(event?.ministryName ?? '');
    setType(event?.type ?? 'extra');
    setNote(event?.note ?? '');
  }, [event]);

  if (!isOpen || !date) return null;

  const presetList = Array.from(
    new Set(ministries.map((item) => item.name.trim()).filter(Boolean))
  );
  const isPreset = presetList.includes(ministry);
  const selectValue = isPreset ? ministry : 'custom';
  const minValue = ministry.trim() || 'Ministério';

  const handleSave = () => {
    onSave({ date, ministryName: minValue, type, note: note.trim() || undefined });
    onClose();
  };

  const handleRemove = () => {
    onRemove(date);
    onClose();
  };

  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <div className="drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <strong>Editar Missa</strong>
            <p>{date}</p>
          </div>
          <button type="button" className="button secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
        <form>
          <label htmlFor="ministry">Ministério</label>
          <select
            id="ministry"
            value={selectValue}
            onChange={(event) => setMinistry(event.target.value === 'custom' ? '' : event.target.value)}
          >
            {presetList.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
            <option value="custom">Outro...</option>
          </select>
          <input
            placeholder="Digite ou cole o nome"
            value={ministry}
            onChange={(event) => setMinistry(event.target.value)}
          />
          <label htmlFor="type">Tipo</label>
          <select id="type" value={type} onChange={(event) => setType(event.target.value as EventType)}>
            <option value="regular">Regular</option>
            <option value="extra">Extra</option>
          </select>
          <label htmlFor="note">Observação</label>
          <textarea
            id="note"
            placeholder="Ex: celebração especial"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </form>
        <div className="button-group">
          <button type="button" className="button primary" onClick={handleSave}>
            Salvar 
          </button>
          {hasException && (
            <button type="button" className="button secondary" onClick={handleRemove}>
              Remover
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditEventDrawer;
