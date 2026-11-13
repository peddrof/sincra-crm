import { StatusPill } from "@/components/StatusPill";
import { driveLocalConfigurado, driveLocalDisponivel } from "@/lib/drive-local";

// Drive pela pasta sincronizada do Google Drive para computador (decisão de 11/11/2026).
export async function DriveLocalSecao() {
  const configurado = driveLocalConfigurado();
  const disponivel = configurado && (await driveLocalDisponivel());
  const linhas = [
    { rotulo: "Pasta da Sincra", valor: process.env.DRIVE_LOCAL_RAIZ },
    { rotulo: "Documentos dos clientes", valor: process.env.DRIVE_LOCAL_CLIENTES },
    { rotulo: "Transcrições", valor: process.env.DRIVE_LOCAL_TRANSCRICOES },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-[22px] text-tinta-3">
          A plataforma lê e grava na pasta que o app Google Drive sincroniza neste computador. Só cria a pasta de cada
          cliente e grava arquivos novos; nunca apaga nem move nada.
        </p>
        {disponivel ? (
          <StatusPill tipo="concluido">Pasta encontrada</StatusPill>
        ) : configurado ? (
          <StatusPill tipo="critico">Pasta não encontrada</StatusPill>
        ) : (
          <StatusPill tipo="atencao">Não configurado</StatusPill>
        )}
      </div>
      <dl className="grid gap-2 rounded-campo bg-superficie p-3 text-sm">
        {linhas.map((l) => (
          <div key={l.rotulo} className="flex flex-wrap gap-x-2">
            <dt className="font-semibold text-tinta-2">{l.rotulo}:</dt>
            <dd className="break-all text-tinta-3">{l.valor || "—"}</dd>
          </div>
        ))}
      </dl>
      {!disponivel && (
        <p className="text-xs leading-4 text-cinza">
          Confira se o app Google Drive está aberto e se as variáveis DRIVE_LOCAL_* do .env.local apontam para a pasta certa.
        </p>
      )}
    </div>
  );
}
