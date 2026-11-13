"use client";

import { useState } from "react";
import { apagarComentario, apagarPost, editarComentario } from "@/lib/actions/feed";

export type ComentarioVisivel = {
  id: string;
  autor: string;
  body: string;
  quando: string;
  editado: boolean;
  meu: boolean;
};

export function Comentario({ c }: { c: ComentarioVisivel }) {
  const [editando, setEditando] = useState(false);

  return (
    <div className="rounded-campo bg-azul-25 px-3 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs leading-4 text-cinza">
          <span className="font-semibold text-sincra-tinta">{c.autor}</span> · <span className="tabular">{c.quando}</span>
          {c.editado && " · editado"}
        </p>
        {c.meu && !editando && (
          <div className="flex gap-3">
            <button type="button" onClick={() => setEditando(true)} className="text-xs font-semibold text-sincra-tinta">
              Editar
            </button>
            <form
              action={apagarComentario}
              onSubmit={(e) => {
                if (!window.confirm("Apagar este comentário?")) e.preventDefault();
              }}
            >
              <input type="hidden" name="comment_id" value={c.id} />
              <button type="submit" className="text-xs font-semibold text-critico">
                Apagar
              </button>
            </form>
          </div>
        )}
      </div>
      {editando ? (
        <form action={editarComentario} onSubmit={() => setEditando(false)} className="flex flex-col gap-2 pt-2">
          <input type="hidden" name="comment_id" value={c.id} />
          <textarea
            name="body"
            required
            maxLength={4000}
            defaultValue={c.body}
            aria-label="Editar comentário"
            className="min-h-16 w-full rounded-campo border border-linha bg-white px-3 py-2 text-sm outline-none focus:border-sincra focus:ring-3 focus:ring-azul-100"
          />
          <div className="flex gap-2">
            <button type="submit" className="h-8 rounded-full bg-sincra px-3 text-xs font-semibold text-white hover:bg-sincra-tinta">
              Salvar
            </button>
            <button type="button" onClick={() => setEditando(false)} className="h-8 rounded-full border border-linha bg-white px-3 text-xs font-semibold text-tinta">
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm leading-[22px] break-words whitespace-pre-line text-tinta-3">{c.body}</p>
      )}
    </div>
  );
}

export function ApagarPost({ eventoId }: { eventoId: string }) {
  return (
    <form
      action={apagarPost}
      onSubmit={(e) => {
        if (!window.confirm("Apagar este post? O anexo, se houver, também é apagado.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="event_id" value={eventoId} />
      <button type="submit" className="text-sm font-semibold text-critico">
        Apagar post
      </button>
    </form>
  );
}
