import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  limit,
  increment,
  arrayUnion as arrayUnionFb,
  arrayRemove as arrayRemoveFb,
} from 'firebase/firestore';
import { db } from '../firebase';

export function useCollection(colName, constraints = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = collection(db, colName);
    const q = constraints.length ? query(ref, ...constraints) : query(ref);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colName, JSON.stringify(constraints.map(c => c?.type))]);

  return { data, loading };
}

export function useAnnonces() {
  return useCollection('annonces', [orderBy('createdAt', 'desc'), limit(20)]);
}

export function useEDT(promo) {
  const [edt, setEdt] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Si pas de promo → charger TOUS les cours
    const ref = collection(db, 'edt');
    const q = promo
      ? query(ref, where('promo', '==', promo), orderBy('heureDebut'))
      : query(ref, orderBy('heureDebut'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const grouped = {};
        snap.docs.forEach((d) => {
          const data = { id: d.id, ...d.data() };
          if (!grouped[data.jour]) grouped[data.jour] = [];
          grouped[data.jour].push(data);
        });
        setEdt(grouped);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [promo]);

  return { edt, loading };
}

export function useRessources() {
  return useCollection('ressources', [orderBy('createdAt', 'desc')]);
}

export function usePosts() {
  return useCollection('posts', [orderBy('createdAt', 'desc'), limit(30)]);
}

export function useOffres() {
  return useCollection('offres', [orderBy('createdAt', 'desc')]);
}

export function useUsers(status = null) {
  const constraints = status
    ? [where('status', '==', status), orderBy('createdAt', 'desc')]
    : [orderBy('createdAt', 'desc')];
  return useCollection('users', constraints);
}

export const addDocument = (col, data) =>
  addDoc(collection(db, col), { ...data, createdAt: serverTimestamp() });
export const updateDocument = (col, id, data) =>
  updateDoc(doc(db, col, id), data);
export const deleteDocument = (col, id) => deleteDoc(doc(db, col, id));
export const approveUser = (uid) =>
  updateDoc(doc(db, 'users', uid), {
    status: 'approved',
    approvedAt: serverTimestamp(),
  });
export const rejectUser = (uid) =>
  updateDoc(doc(db, 'users', uid), { status: 'rejected' });

// ── Comments ──────────────────────────────────────────────────────────────────
export function useComments(postId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!postId) { setComments([]); setLoading(false); return; }
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    return onSnapshot(q, s => {
      setComments(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
  }, [postId]);
  return { comments, loading };
}

export const addComment = async (postId, data) => {
  await addDoc(collection(db, 'posts', postId, 'comments'), { ...data, createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'posts', postId), { commentCount: increment(1) });
};

export const deleteComment = async (postId, commentId, authorUid, currentUid) => {
  if (authorUid !== currentUid) return;
  await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
  await updateDoc(doc(db, 'posts', postId), { commentCount: increment(-1) });
};

// ── Groups ────────────────────────────────────────────────────────────────────
export function useGroups() {
  return useCollection('groups', [orderBy('lastAt', 'desc')]);
}

export function useGroupMessages(groupId) {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!groupId) { setMsgs([]); setLoading(false); return; }
    const q = query(
      collection(db, 'groups', groupId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
    return onSnapshot(q, s => {
      setMsgs(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
  }, [groupId]);
  return { msgs, loading };
}

export const createGroup = (data) =>
  addDoc(collection(db, 'groups'), { ...data, createdAt: serverTimestamp(), lastAt: serverTimestamp() });

export const joinGroup = (groupId, uid) =>
  updateDoc(doc(db, 'groups', groupId), { members: arrayUnionFb(uid) });

export const leaveGroup = (groupId, uid) =>
  updateDoc(doc(db, 'groups', groupId), { members: arrayRemoveFb(uid) });

export const sendGroupMessage = async (groupId, data) => {
  await addDoc(collection(db, 'groups', groupId, 'messages'), { ...data, createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'groups', groupId), { lastMessage: data.text, lastAt: serverTimestamp() });
};

// ── Notifications ─────────────────────────────────────────────────────────────
export function useNotifs(uid) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) { setNotifs([]); setLoading(false); return; }
    const q = query(
      collection(db, 'notifications', uid, 'items'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    return onSnapshot(q, s => {
      setNotifs(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
  }, [uid]);
  const unread = notifs.filter(n => !n.read).length;
  return { notifs, unread, loading };
}

export const markNotifsRead = async (uid) => {
  const q = query(collection(db, 'notifications', uid, 'items'), where('read', '==', false));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })));
};

export const sendNotif = (toUid, data) =>
  addDoc(collection(db, 'notifications', toUid, 'items'), {
    ...data, read: false, createdAt: serverTimestamp(),
  });

export async function seedDemoData() {
  const annonces = [
    {
      titre: 'Planning définitif des soutenances MPTML — Juin 2026',
      cat: 'Soutenance',
      urgent: true,
      auteur: 'Direction Académique',
      contenu:
        'Les soutenances de la Promotion 34 se dérouleront du 16 au 20 juin 2026.',
      promo: 'tous',
    },
    {
      titre: 'Dépôt final des mémoires — délai impératif 30 mai',
      cat: 'Scolarité',
      urgent: true,
      auteur: 'Scolarité ARSTM',
      contenu: 'La date limite est fixée au vendredi 30 mai 2026 à 17h00.',
      promo: 'tous',
    },
    {
      titre: 'Forum Emploi ARSTM Alumni — Samedi 6 juin 2026',
      cat: 'Événement',
      urgent: false,
      auteur: 'Association Alumni ARSTM',
      contenu: 'La 3e édition du Forum Emploi aura lieu le 6 juin 2026.',
      promo: 'tous',
    },
  ];
  const edt = [
    {
      jour: 'Lundi',
      heureDebut: '08:00',
      heureFin: '10:00',
      matiere: 'Droit Maritime International',
      salle: 'Amphi A',
      prof: 'M. Ette Jean-Marc',
      tag: 'Droit',
      color: '#2563eb',
      promo: 'MPTML — Promo 34',
    },
    {
      jour: 'Lundi',
      heureDebut: '10:30',
      heureFin: '12:30',
      matiere: 'Supply Chain Avancée',
      salle: 'Salle 12',
      prof: 'M. Dosso Ismaël',
      tag: 'Logistique',
      color: '#0891b2',
      promo: 'MPTML — Promo 34',
    },
    {
      jour: 'Mardi',
      heureDebut: '08:00',
      heureFin: '10:00',
      matiere: 'Douanes & Transit',
      salle: 'Salle 08',
      prof: 'M. Maock Joseph',
      tag: 'Douanes',
      color: '#059669',
      promo: 'MPTML — Promo 34',
    },
    {
      jour: 'Mercredi',
      heureDebut: '09:00',
      heureFin: '11:00',
      matiere: 'Incoterms & Commerce Int.',
      salle: 'Salle 05',
      prof: 'M. Dosso Ismaël',
      tag: 'Commerce',
      color: '#0891b2',
      promo: 'MPTML — Promo 34',
    },
    {
      jour: 'Jeudi',
      heureDebut: '08:00',
      heureFin: '10:00',
      matiere: 'Logistique Portuaire',
      salle: 'Amphi A',
      prof: 'M. Daple Vincent',
      tag: 'Logistique',
      color: '#059669',
      promo: 'MPTML — Promo 34',
    },
    {
      jour: 'Vendredi',
      heureDebut: '08:00',
      heureFin: '10:00',
      matiere: 'Projet Tutoré MPTML',
      salle: 'Salle 08',
      prof: 'Encadrants',
      tag: 'Projet',
      color: '#7c3aed',
      promo: 'MPTML — Promo 34',
    },
  ];
  const ressources = [
    {
      titre: 'Cours Incoterms 2020 — Édition complète',
      type: 'PDF',
      taille: '2.4 Mo',
      auteur: 'M. Dosso Ismaël',
      module: 'Incoterms',
      filiere: 'MPTML',
      url: '#',
      dl: 87,
      nouveau: true,
    },
    {
      titre: 'Supply Chain Avancée — Support S2',
      type: 'PPT',
      taille: '5.1 Mo',
      auteur: 'M. Dosso Ismaël',
      module: 'Supply Chain',
      filiere: 'MPTML',
      url: '#',
      dl: 112,
      nouveau: false,
    },
    {
      titre: 'Guide officiel rédaction mémoire MPTML 2026',
      type: 'DOC',
      taille: '780 Ko',
      auteur: 'Direction Académique',
      module: 'Mémoire',
      filiere: 'MPTML',
      url: '#',
      dl: 245,
      nouveau: false,
    },
  ];
  const offres = [
    {
      titre: 'Stage Opérations Transit — 6 mois',
      ent: 'BOLLORÉ LOGISTICS CI',
      type: 'Stage',
      lieu: 'Abidjan, Vridi',
      secteur: 'Transit',
      alumni: 'Dr. Kouao Arthur',
      desc: 'Suivi des opérations douanières.',
      tags: ['Transit'],
    },
    {
      titre: 'Stagiaire Supply Chain',
      ent: 'NESTLÉ CI',
      type: 'Stage',
      lieu: 'Zone Industrielle',
      secteur: 'Supply Chain',
      alumni: 'Mme. Traoré Salimata',
      desc: 'Suivi des flux logistiques.',
      tags: ['Supply Chain'],
    },
    {
      titre: "Agent d'Escale Junior — CDI",
      ent: 'CMA CGM CI',
      type: 'CDI',
      lieu: 'Port Autonome',
      secteur: 'Maritime',
      alumni: 'M. Yao Pierre',
      desc: 'Gestion des escales navires.',
      tags: ['Maritime'],
    },
  ];
  const posts = [
    {
      auteur: 'Awa K.',
      avatar: 'AK',
      role: 'etudiant',
      promo: 'MPTML P34',
      texte: "Quelqu'un a les notes du TD de logistique de vendredi ? 🙏",
      likes: [],
      comments: [],
    },
    {
      auteur: 'Marc B.',
      avatar: 'MB',
      role: 'etudiant',
      promo: 'LPTML P36',
      texte: 'Groupe de révision samedi 9h bibliothèque ?',
      likes: [],
      comments: [],
    },
  ];

  for (const a of annonces) await addDocument('annonces', a);
  for (const e of edt) await addDocument('edt', e);
  for (const r of ressources) await addDocument('ressources', r);
  for (const o of offres) await addDocument('offres', o);
  for (const p of posts) await addDocument('posts', p);
}
