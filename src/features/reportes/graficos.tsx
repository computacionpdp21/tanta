import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ESTADO_LABELS, TIPO_ENTREGA_LABELS } from "@/lib/constants";
import { formatFecha } from "@/lib/dates";
import { formatBs } from "@/lib/formatters";
import type { ReporteDia, ReporteEstado, ReporteProducto, ReporteTipo } from "@/hooks/use-reporte";

const COLORES = ["#E08A2E", "#7A4A21", "#2F6F4E", "#C9A227", "#3D6EA8"];

function tooltipBs(value: number | string) {
  return formatBs(typeof value === "number" ? value : Number(value));
}

export function GraficoPedidosDia({ datos }: { datos: ReporteDia[] }) {
  const series = datos.map((item) => ({
    ...item,
    etiqueta: formatFecha(item.fecha, "d MMM"),
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ead4b5" />
          <XAxis dataKey="etiqueta" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="pedidos" name="Pedidos" fill="#7A4A21" radius={[6, 6, 0, 0]} />
          <Bar dataKey="unidades" name="Unidades" fill="#E08A2E" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoVentasDia({ datos }: { datos: ReporteDia[] }) {
  const series = datos.map((item) => ({
    ...item,
    etiqueta: formatFecha(item.fecha, "d MMM"),
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ead4b5" />
          <XAxis dataKey="etiqueta" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => tooltipBs(typeof value === "number" ? value : Number(value))} />
          <Legend />
          <Line type="monotone" dataKey="ventas" name="Ventas (Bs)" stroke="#2F6F4E" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoTipos({ datos }: { datos: ReporteTipo[] }) {
  const series = datos.map((item) => ({
    name: TIPO_ENTREGA_LABELS[item.tipo],
    value: item.cantidad,
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={series} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
            {series.map((item, index) => (
              <Cell key={item.name} fill={COLORES[index % COLORES.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoEstados({ datos }: { datos: ReporteEstado[] }) {
  const series = datos.map((item) => ({
    name: ESTADO_LABELS[item.estado] ?? item.estado,
    value: item.cantidad,
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={series} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
            {series.map((item, index) => (
              <Cell key={item.name} fill={COLORES[index % COLORES.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoProductos({ datos }: { datos: ReporteProducto[] }) {
  const series = datos.slice(0, 12).map((item) => ({
    etiqueta: `${item.nombre} ${item.tamano}`,
    unidades: item.unidades,
  }));
  const alto = Math.max(240, series.length * 36);
  return (
    <div className="w-full" style={{ height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ead4b5" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="etiqueta" width={120} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="unidades" name="Unidades" fill="#E08A2E" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
