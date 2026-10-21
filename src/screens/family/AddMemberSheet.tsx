import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Avatar, Button, ChoiceChipGroup, Field, Sheet } from '../../components/index.ts';
import { useAppState, useDispatch } from '../../data/react.tsx';
import { nowIso } from '../../lib/ids.ts';
import { usePersona } from '../../lib/session.ts';
import { initialsFromName, LIMITS, personIdFromName, type Relationship } from '../../shared/index.ts';
import { pronounsFor } from './people.ts';
import './family.css';

type ChosenRelationship = Extract<Relationship, 'mum' | 'dad' | 'aunt' | 'uncle' | 'cousin' | 'other'>;

const RELATIONSHIP_OPTIONS: { value: ChosenRelationship; label: string }[] = [
  { value: 'mum', label: 'Mum' },
  { value: 'dad', label: 'Dad' },
  { value: 'aunt', label: 'Aunt' },
  { value: 'uncle', label: 'Uncle' },
  { value: 'cousin', label: 'Cousin' },
  { value: 'other', label: 'Other' },
];

type ContactPicker = {
  select: (properties: string[], options?: { multiple?: boolean }) => Promise<{ name?: string[] }[]>;
};

function contactPicker(): ContactPicker | null {
  const contacts = (navigator as Navigator & { contacts?: ContactPicker }).contacts;
  return contacts && typeof contacts.select === 'function' ? contacts : null;
}

export type AddMemberSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Called after the person is added, with the new id. */
  onAdded: (personId: string) => void;
};

/** 06a Add family member (372:2017). */
export function AddMemberSheet({ open, onClose, onAdded }: AddMemberSheetProps) {
  const state = useAppState();
  const dispatch = useDispatch();
  const persona = usePersona();
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState<ChosenRelationship | null>(null);
  const [contactsNote, setContactsNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // The sheet puts focus on its first button when it opens. Move it on to the name box.
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLInputElement>('input')?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function reset() {
    setName('');
    setRelationship(null);
    setContactsNote('');
    setError('');
    setBusy(false);
  }

  function close() {
    reset();
    onClose();
  }

  const trimmed = name.trim();
  const canAdd = trimmed.length > 0 && relationship !== null && !busy;
  const pronoun = trimmed ? pronounsFor(relationship).subject : 'They';
  const who = trimmed || 'This person';

  async function add() {
    if (!canAdd || relationship === null) return;
    const id = personIdFromName(trimmed, state.people);
    setBusy(true);
    try {
      await dispatch({ type: 'person/add', id, name: trimmed, relationship, by: persona, at: nowIso() });
      reset();
      onAdded(id);
    } catch {
      setBusy(false);
      setError('Could not add this person. Try again.');
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void add();
  }

  async function chooseFromContacts() {
    const picker = contactPicker();
    if (!picker) {
      setContactsNote('Contacts are not available in this browser.');
      return;
    }
    setContactsNote('');
    try {
      const picked = await picker.select(['name'], { multiple: false });
      const chosen = picked[0]?.name?.[0];
      if (chosen) setName(chosen.slice(0, LIMITS.name));
    } catch {
      setContactsNote('Could not open your contacts.');
    }
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Add family member"
      leftAction={{ label: 'Cancel', onClick: close }}
      rightAction={{ label: 'Add', onClick: () => void add(), disabled: !canAdd }}
    >
      <form className="fam-sheet" ref={formRef} onSubmit={onSubmit} noValidate>
        <div className="fam-sheet__preview">
          <Avatar initials={initialsFromName(name)} size={72} label={`Preview of ${trimmed || 'the new member'}`} />
        </div>
        <Field label="Name" value={name} onChange={setName} maxLength={LIMITS.name} autoComplete="off" />
        <ChoiceChipGroup<ChosenRelationship>
          label="Relationship"
          options={RELATIONSHIP_OPTIONS}
          value={relationship}
          onChange={setRelationship}
        />
        <div className="fam-sheet__contacts">
          <Button variant="link" size="md" onClick={() => void chooseFromContacts()}>
            Choose from Contacts
          </Button>
          <p role="status" className="t-body t-muted">
            {contactsNote}
          </p>
        </div>
        <p className="t-body t-muted">
          {who} gets a link to join your family space. {pronoun} can then listen to stories and add meanings.
        </p>
        {error && (
          <p role="alert" className="t-body t-danger">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}
