import { z } from "zod";
import { esFechaPasada } from "@/lib/dates";
import { normalizarTelefonoBO } from "@/lib/phone";

const metodos = ["efectivo", "qr", "transferencia"] as const;

export const itemSchema = z.object({
  producto_id: z.string().nullable(),
  descripcion: z.string().trim().min(1, "Elige un producto o escribe una descripción"),
  cantidad: z.coerce.number().int().min(1, "Mínimo 1"),
  precio_unitario: z.coerce.number().min(0, "El precio no puede ser negativo"),
  notas_item: z.string().optional().default(""),
});

export function createPedidoSchema(permitirFechaPasada: boolean) {
  return z
    .object({
      cliente_nombre: z.string().trim().min(2, "Escribe el nombre del cliente"),
      cliente_telefono: z
        .string()
        .min(1, "El teléfono es obligatorio")
        .refine((value) => Boolean(normalizarTelefonoBO(value)), {
          message: "Usa un celular boliviano de 8 dígitos que empiece con 6 o 7",
        }),
      tipo_entrega: z.enum(["recojo", "envio"]),
      direccion: z.string().optional().default(""),
      referencia_ubicacion: z.string().optional().default(""),
      fecha_entrega: z.string().min(1, "Elige la fecha de entrega"),
      hora_entrega: z.string().min(1, "Elige la hora de entrega"),
      adelanto: z.coerce.number().min(0, "El adelanto no puede ser negativo"),
      metodo_pago_adelanto: z.enum(metodos).nullable(),
      costo_envio: z.coerce.number().min(0, "El envío no puede ser negativo"),
      notas: z.string().optional().default(""),
      items: z.array(itemSchema).min(1, "Agrega al menos un ítem"),
    })
    .superRefine((data, ctx) => {
      if (!permitirFechaPasada && esFechaPasada(data.fecha_entrega)) {
        ctx.addIssue({
          code: "custom",
          path: ["fecha_entrega"],
          message: "No se puede crear un pedido con fecha pasada",
        });
      }
      if (data.tipo_entrega === "envio" && data.direccion.trim().length < 5) {
        ctx.addIssue({
          code: "custom",
          path: ["direccion"],
          message: "La dirección es obligatoria para envío",
        });
      }
      const subtotal = data.items.reduce(
        (sum, item) => sum + item.cantidad * item.precio_unitario,
        0,
      );
      const envio = data.tipo_entrega === "envio" ? data.costo_envio : 0;
      const total = subtotal + envio;
      if (data.adelanto > total) {
        ctx.addIssue({
          code: "custom",
          path: ["adelanto"],
          message: "El adelanto no puede ser mayor al total",
        });
      }
      if (data.adelanto > 0 && !data.metodo_pago_adelanto) {
        ctx.addIssue({
          code: "custom",
          path: ["metodo_pago_adelanto"],
          message: "Elige cómo pagó el adelanto",
        });
      }
    });
}

export type PedidoFormValues = z.input<ReturnType<typeof createPedidoSchema>>;
