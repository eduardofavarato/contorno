import { freeReducer, freeStats, getCountry, startFree, type RegionId, type FreeAnswer } from '@contorno/core';
import { useState } from 'react';
import { FREE_MODE_COPY } from '../../copy';
import { LazyMap } from '../../map/LazyMap';
import type { MapTone } from '../../map/MapView';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { GameLayout } from '../GameLayout';
import { AnswerForm } from '../panel/AnswerForm';
import { FeedbackLine } from '../panel/FeedbackLine';
import { PanelInfo } from '../panel/PanelInfo';
import { ResultTooltip } from '../ResultTooltip';
import { Stat } from '../Stat';
import { useReducer } from 'react';

interface FreeGameProps {
  readonly onQuit: () => void;
}

function hint(selected: RegionId | null, lastAnswered: boolean): string {
  if (selected !== null) return 'País selecionado — qual é o nome dele?';
  return lastAnswered ? 'Clique em outro país para continuar' : 'Clique em um país no mapa para adivinhar';
}

export function FreeGame({ onQuit }: FreeGameProps) {
  const [state, dispatch] = useReducer(freeReducer, undefined, startFree);
  const [confirmingQuit, setConfirmingQuit] = useState(false);
  const { correct, total } = freeStats(state);

  const tones = new Map<RegionId, MapTone>();
  for (const [id, answer] of state.answers) tones.set(id, answer.correct ? 'correct' : 'wrong');
  if (state.selected !== null) tones.set(state.selected, 'target');

  // Map keeps insertion order, so the last key is the country answered most recently.
  const lastId = [...state.answers.keys()].at(-1);
  const last: FreeAnswer | undefined =
    state.selected === null && lastId !== undefined ? state.answers.get(lastId) : undefined;

  const bottom = (
    <>
      <PanelInfo>{hint(state.selected, last !== undefined)}</PanelInfo>
      <AnswerForm
        key={state.selected ?? 'idle'}
        label="Nome do país"
        placeholder={state.selected === null ? 'Selecione um país no mapa…' : 'Nome do país…'}
        disabled={state.selected === null && last === undefined}
        settled={
          last && lastId !== undefined ? { text: getCountry(lastId).name, tone: last.correct ? 'ok' : 'bad' } : null
        }
        onSubmit={(text) => {
          dispatch({ type: 'answer', text });
        }}
      />
      <FeedbackLine
        feedback={
          last && lastId !== undefined
            ? last.correct
              ? { text: `✓ Correto! ${getCountry(lastId).name}`, tone: 'ok' }
              : { text: `✗ Era: ${getCountry(lastId).name}`, tone: 'bad' }
            : null
        }
      />
    </>
  );

  return (
    <>
      <GameLayout
        badge={FREE_MODE_COPY.title}
        onQuit={() => {
          setConfirmingQuit(true);
        }}
        stats={
          <>
            <Stat label="Acertos" value={String(correct)} tone="green" />
            <Stat label="Tentativas" value={String(total)} />
          </>
        }
        bottom={bottom}
      >
        <LazyMap
          map="world"
          tones={tones}
          onRegionClick={(id) => {
            dispatch({ type: 'select', id });
          }}
          renderTooltip={(id) => {
            const answer = state.answers.get(id);
            if (!answer) return null;
            const name = getCountry(id).name;
            return answer.correct ? (
              <ResultTooltip tone="ok" heading="✓ Correto" name={name} />
            ) : (
              <ResultTooltip tone="bad" heading="✗ Incorreto" name={name} detail={`Tentativa: "${answer.attempt}"`} />
            );
          }}
        />
      </GameLayout>

      {confirmingQuit && (
        <ConfirmDialog
          title="Sair do Modo Livre?"
          message="Seus acertos serão perdidos."
          confirmLabel="Sair"
          cancelLabel="Continuar"
          onConfirm={onQuit}
          onCancel={() => {
            setConfirmingQuit(false);
          }}
        />
      )}
    </>
  );
}
