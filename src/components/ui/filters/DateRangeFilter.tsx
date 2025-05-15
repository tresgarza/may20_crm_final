import React, { useState, useEffect, useRef, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { es } from 'date-fns/locale';

export type DateRangeOption = 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'custom';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface DateRangeFilterProps {
  onChange: (range: DateRange) => void;
  initialOption?: DateRangeOption;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  onChange,
  initialOption = 'all'
}) => {
  const [selectedOption, setSelectedOption] = useState<DateRangeOption>(initialOption);
  const [customRange, setCustomRange] = useState<DateRange>({
    startDate: null,
    endDate: null
  });
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú cuando se hace clic fuera de él
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Genera el rango de fechas basado en la opción seleccionada
  const generateDateRange = useCallback((option: DateRangeOption): DateRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (option) {
      case 'today':
        return {
          startDate: today,
          endDate: today
        };
      
      case 'thisWeek': {
        // Obtener el primer día de la semana (lunes)
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Ajustar cuando es domingo
        const startDate = new Date(now);
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        
        return { startDate, endDate };
      }
      
      case 'thisMonth': {
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        
        return { startDate, endDate };
      }
      
      case 'thisYear': {
        const startDate = new Date(now.getFullYear(), 0, 1);
        const endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        
        return { startDate, endDate };
      }
      
      case 'custom':
        return customRange;
      
      case 'all':
      default:
        return { startDate: null, endDate: null };
    }
  }, [customRange]);

  // Actualizar el rango de fechas cuando cambia la opción
  useEffect(() => {
    if (selectedOption !== 'custom') {
      const range = generateDateRange(selectedOption);
      onChange(range);
    } else if (selectedOption === 'custom' && customRange.startDate && customRange.endDate) {
      onChange(customRange);
    }
  }, [selectedOption, onChange, generateDateRange, customRange]);

  // Formatea la fecha para mostrarla en el botón
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Genera el texto que muestra el rango seleccionado
  const getDisplayText = (): string => {
    switch (selectedOption) {
      case 'all':
        return 'Todo el tiempo';
      case 'today':
        return 'Hoy';
      case 'thisWeek':
        return 'Esta semana';
      case 'thisMonth':
        return 'Este mes';
      case 'thisYear':
        return 'Este año';
      case 'custom':
        if (customRange.startDate && customRange.endDate) {
          return `${formatDate(customRange.startDate)} - ${formatDate(customRange.endDate)}`;
        }
        return 'Rango personalizado';
      default:
        return 'Seleccionar rango';
    }
  };

  // Maneja el cambio en el rango personalizado
  const handleCustomRangeChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    const newRange = {
      startDate: start,
      endDate: end
    };
    
    setCustomRange(newRange);
    
    if (start && end) {
      onChange(newRange);
      setIsOpen(false);
    }
  };

  // Manejar la selección de una opción
  const handleOptionClick = (option: DateRangeOption) => {
    console.log('DateRangeFilter: Option clicked:', option);
    setSelectedOption(option);
    
    // Para opciones distintas a 'custom', cerrar el menú inmediatamente
    if (option !== 'custom') {
      const range = generateDateRange(option);
      console.log('DateRangeFilter: Generated range for option', option, ':', range);
      onChange(range);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center gap-2 btn btn-outline cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
        </svg>
        <span>{getDisplayText()}</span>
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 p-2 shadow bg-base-100 rounded-box z-50 w-full md:w-80 border border-gray-200">
          <ul className="space-y-1">
            <li>
              <button 
                className={`w-full text-left p-2 rounded hover:bg-gray-100 ${selectedOption === 'all' ? 'bg-primary text-white hover:bg-primary-focus' : ''}`}
                onClick={() => handleOptionClick('all')}
                type="button"
              >
                Todo el tiempo
              </button>
            </li>
            <li>
              <button 
                className={`w-full text-left p-2 rounded hover:bg-gray-100 ${selectedOption === 'today' ? 'bg-primary text-white hover:bg-primary-focus' : ''}`}
                onClick={() => handleOptionClick('today')}
                type="button"
              >
                Hoy
              </button>
            </li>
            <li>
              <button 
                className={`w-full text-left p-2 rounded hover:bg-gray-100 ${selectedOption === 'thisWeek' ? 'bg-primary text-white hover:bg-primary-focus' : ''}`}
                onClick={() => handleOptionClick('thisWeek')}
                type="button"
              >
                Esta semana
              </button>
            </li>
            <li>
              <button 
                className={`w-full text-left p-2 rounded hover:bg-gray-100 ${selectedOption === 'thisMonth' ? 'bg-primary text-white hover:bg-primary-focus' : ''}`}
                onClick={() => handleOptionClick('thisMonth')}
                type="button"
              >
                Este mes
              </button>
            </li>
            <li>
              <button 
                className={`w-full text-left p-2 rounded hover:bg-gray-100 ${selectedOption === 'thisYear' ? 'bg-primary text-white hover:bg-primary-focus' : ''}`}
                onClick={() => handleOptionClick('thisYear')}
                type="button"
              >
                Este año
              </button>
            </li>
            <li>
              <button 
                className={`w-full text-left p-2 rounded hover:bg-gray-100 ${selectedOption === 'custom' ? 'bg-primary text-white hover:bg-primary-focus' : ''}`}
                onClick={() => handleOptionClick('custom')}
                type="button"
              >
                Rango personalizado
              </button>
            </li>
          </ul>
          
          {selectedOption === 'custom' && (
            <div className="mt-3 p-2 border rounded">
              <DatePicker
                selected={customRange.startDate}
                onChange={handleCustomRangeChange}
                startDate={customRange.startDate}
                endDate={customRange.endDate}
                selectsRange
                inline
                locale={es}
                monthsShown={1}
                dateFormat="dd/MM/yyyy"
                fixedHeight
                className="w-full"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter; 