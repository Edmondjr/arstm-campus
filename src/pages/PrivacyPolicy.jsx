// src/pages/PrivacyPolicy.jsx
import { C, SHADOWS } from "../design";

const SECTIONS = [
  {
    num: "1",
    title: "Préambule",
    content: `La présente Politique de Confidentialité décrit comment ARSTM Campus (ci-après « la Plateforme »), plateforme numérique communautaire dédiée aux étudiants, enseignants, alumni et personnel administratif de l'Académie Régionale des Sciences et Techniques de la Mer (ARSTM), collecte, utilise, protège et partage les données à caractère personnel de ses utilisateurs.

En créant un compte et en utilisant la Plateforme, l'utilisateur reconnaît avoir pris connaissance de la présente politique et consent au traitement de ses données dans les conditions décrites ci-dessous. L'utilisateur conserve à tout moment la possibilité d'ajuster certains paramètres de confidentialité depuis son profil, ou de retirer son consentement conformément à la section 9.

Cette politique s'inscrit dans le respect des principes de la Loi n°2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel de Côte d'Ivoire, sous le contrôle de l'Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire (ARTCI).`,
  },
  {
    num: "2",
    title: "Responsable du traitement",
    content: `Le traitement des données est assuré par l'équipe de développement et d'administration d'ARSTM Campus, en coordination avec l'administration de l'ARSTM en tant qu'établissement hébergeant la communauté d'utilisateurs.

Toute question relative à cette politique peut être adressée via le Centre d'Assistance (Support Center) intégré à la Plateforme, ou à l'adresse de contact communiquée dans l'application.`,
  },
  {
    num: "3",
    title: "Données collectées",
    subsections: [
      {
        sub: "3.1",
        title: "Données d'identification et de profil",
        items: [
          "Nom, prénom, adresse e-mail, numéro de téléphone (le cas échéant)",
          "Photo de profil et photo de couverture",
          "Rôle sur la plateforme (Étudiant, Enseignant, Alumni, Administrateur, Super-administrateur)",
          "Filière, promotion, année d'étude ou fonction au sein de l'ARSTM",
          "Biographie, centres d'intérêt et informations facultatives ajoutées par l'utilisateur",
        ],
      },
      {
        sub: "3.2",
        title: "Données de contenu et d'activité",
        items: [
          "Publications, commentaires et réactions sur le fil social",
          "Messages échangés via la messagerie interne",
          "Statut de connexion, horodatages d'activité (dernière connexion, statut « en ligne »)",
          "Fichiers, images ou documents partagés sur la Plateforme",
        ],
      },
      {
        sub: "3.3",
        title: "Données techniques",
        items: [
          "Données de connexion (identifiants de session, journaux techniques)",
          "Informations relatives à l'appareil et au navigateur utilisés, dans la mesure nécessaire au bon fonctionnement du service",
        ],
      },
    ],
  },
  {
    num: "4",
    title: "Finalités du traitement",
    items: [
      "Créer, authentifier et sécuriser les comptes utilisateurs",
      "Permettre les fonctionnalités sociales (fil d'actualité, publications, réactions)",
      "Permettre la messagerie et la communication entre utilisateurs",
      "Assurer la modération, la sécurité et le bon fonctionnement de la Plateforme",
      "Fournir un support technique aux utilisateurs",
      "Générer des statistiques d'usage agrégées et anonymisées à des fins d'amélioration du service",
      "Permettre à l'administration de l'ARSTM d'assurer le suivi pédagogique et administratif de sa communauté",
    ],
    footer: "Les données ne sont en aucun cas utilisées à des fins commerciales, publicitaires, ou revendues à des tiers.",
  },
  {
    num: "5",
    title: "Hiérarchie des accès aux données",
    subsections: [
      {
        sub: "5.1",
        title: "Administration de l'établissement et Administrateurs plateforme",
        content: `Les comptes Administrateur et Super-administrateur — représentant l'administration de l'ARSTM ainsi que l'équipe technique responsable de la Plateforme — disposent d'un accès sans restriction à l'ensemble des données des utilisateurs, y compris celles que l'utilisateur aurait configurées comme privées ou restreintes vis-à-vis des autres membres. Cet accès est justifié par :`,
        items: [
          "les nécessités de modération et de sécurité de la Plateforme",
          "les obligations de suivi administratif et pédagogique de l'établissement",
          "la gestion des signalements et des demandes formulées via le Centre d'Assistance",
        ],
        footer: "Cet accès est réservé à un nombre restreint de personnes habilitées, encadré par un devoir de confidentialité, et ne peut être utilisé qu'aux fins décrites dans la présente politique.",
      },
      {
        sub: "5.2",
        title: "Autres rôles (Étudiant, Enseignant, Alumni)",
        content: "Les utilisateurs des autres rôles n'ont pas cet accès étendu. Leur visibilité sur les données d'un autre utilisateur est strictement soumise aux paramètres de confidentialité que chaque utilisateur configure lui-même dans son profil (voir section 6). Un utilisateur peut ainsi, par exemple, restreindre la visibilité de son numéro de téléphone, de son statut de connexion, ou de certaines informations de profil aux seuls membres de sa promotion, à ses contacts, ou à personne d'autre que lui-même.",
      },
    ],
  },
  {
    num: "6",
    title: "Paramètres de confidentialité personnalisables",
    content: "Chaque utilisateur dispose, depuis son profil, d'options lui permettant de configurer :",
    items: [
      "la visibilité de ses informations de profil (public / communauté ARSTM / contacts uniquement / privé)",
      "la visibilité de son statut de connexion et de ses horodatages d'activité",
      "qui peut lui envoyer un message ou une demande de contact",
      "la visibilité de ses publications et interactions sur le fil social",
    ],
    footer: "Ces paramètres peuvent être modifiés à tout moment. Un utilisateur est invité à consulter et ajuster ces réglages dès la première connexion et chaque fois qu'il le juge nécessaire.\n\nRappel : ces paramètres régissent la visibilité entre utilisateurs. Ils ne s'appliquent pas à l'accès de l'administration de l'établissement et des administrateurs plateforme, tel que décrit en section 5.1.",
  },
  {
    num: "7",
    title: "Partage des données avec des tiers",
    content: "ARSTM Campus ne vend ni ne loue les données personnelles des utilisateurs. Les données peuvent être traitées par des prestataires techniques strictement nécessaires au fonctionnement de la Plateforme (hébergement, infrastructure cloud), dans le respect de garanties de sécurité équivalentes à celles décrites dans ce document. Aucune donnée n'est transmise à des fins publicitaires.",
  },
  {
    num: "8",
    title: "Durée de conservation",
    content: "Les données sont conservées pendant toute la durée d'activité du compte de l'utilisateur sur la Plateforme. En cas de suppression de compte, les données personnelles sont supprimées ou anonymisées dans un délai raisonnable, sous réserve des obligations légales de conservation éventuelles.",
  },
  {
    num: "9",
    title: "Droits des utilisateurs",
    content: "Conformément à la réglementation en vigueur, chaque utilisateur dispose des droits suivants concernant ses données personnelles :",
    items: [
      "Droit d'accès : obtenir une copie des données le concernant",
      "Droit de rectification : corriger des données inexactes ou incomplètes",
      "Droit de suppression : demander la suppression de son compte et de ses données",
      "Droit d'opposition : s'opposer à certains traitements",
      "Droit de retrait du consentement à tout moment, sans effet rétroactif",
    ],
    footer: "Ces droits peuvent être exercés via le Centre d'Assistance de la Plateforme ou par le canal de contact indiqué en section 2.",
  },
  {
    num: "10",
    title: "Sécurité des données",
    content: "Des mesures techniques et organisationnelles raisonnables sont mises en œuvre pour protéger les données contre l'accès non autorisé, la perte, l'altération ou la divulgation, notamment via des mécanismes d'authentification et un contrôle des accès basé sur les rôles décrits en section 5.",
  },
  {
    num: "11",
    title: "Modifications de la présente politique",
    content: "Cette politique peut être amenée à évoluer, notamment durant la phase de test de la Plateforme. Toute modification substantielle fera l'objet d'une communication aux utilisateurs (notification in-app et/ou publication sur le forum de la Plateforme).",
  },
  {
    num: "12",
    title: "Consentement et acceptation",
    content: "L'utilisation de la Plateforme est subordonnée à l'acceptation explicite de cette politique lors de l'inscription (case à cocher) ou, pour les comptes déjà actifs en phase de test, via une notification demandant une confirmation de consentement lors de la prochaine connexion.",
  },
];

function SectionBlock({ s }) {
  const headStyle = {
    fontFamily: "'Syne',sans-serif",
    fontWeight: 700,
    fontSize: "0.88rem",
    color: C.navy,
    marginBottom: 6,
    display: "flex",
    alignItems: "center",
    gap: 8,
  };
  const numStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: 6,
    background: C.blueLight,
    color: C.blue,
    fontSize: "0.72rem",
    fontWeight: 800,
    flexShrink: 0,
  };
  const paraStyle = {
    fontSize: "0.82rem",
    color: C.dark,
    lineHeight: 1.7,
    margin: "0 0 8px",
    whiteSpace: "pre-line",
  };
  const subHeadStyle = {
    fontWeight: 700,
    fontSize: "0.81rem",
    color: C.navy,
    margin: "12px 0 5px",
  };
  const itemStyle = {
    display: "flex",
    gap: 8,
    fontSize: "0.81rem",
    color: C.dark,
    lineHeight: 1.65,
    marginBottom: 4,
  };
  const dotStyle = {
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: C.blue,
    flexShrink: 0,
    marginTop: 8,
  };

  return (
    <div style={{ marginBottom: 20, paddingBottom: 18, borderBottom: `1px solid ${C.border}` }}>
      <div style={headStyle}>
        <span style={numStyle}>{s.num}</span>
        <span>{s.title}</span>
      </div>

      {s.content && <p style={paraStyle}>{s.content}</p>}

      {s.items && (
        <ul style={{ margin: "0 0 8px", padding: 0, listStyle: "none" }}>
          {s.items.map((item, i) => (
            <li key={i} style={itemStyle}>
              <span style={dotStyle} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {s.footer && <p style={{ ...paraStyle, color: C.mid, fontStyle: "italic", marginBottom: 0 }}>{s.footer}</p>}

      {s.subsections && s.subsections.map((sub) => (
        <div key={sub.sub} style={{ marginTop: 10, paddingLeft: 12, borderLeft: `2px solid ${C.blueLight}` }}>
          <div style={subHeadStyle}>{sub.sub} — {sub.title}</div>
          {sub.content && <p style={paraStyle}>{sub.content}</p>}
          {sub.items && (
            <ul style={{ margin: "0 0 6px", padding: 0, listStyle: "none" }}>
              {sub.items.map((item, i) => (
                <li key={i} style={itemStyle}>
                  <span style={dotStyle} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          {sub.footer && <p style={{ ...paraStyle, color: C.mid, fontStyle: "italic", marginBottom: 0 }}>{sub.footer}</p>}
        </div>
      ))}
    </div>
  );
}

export default function PrivacyPolicyModal({ onClose, onAccept }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 5000,
      background: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "24px 16px", overflowY: "auto",
    }}>
      <div onClick={e => e.stopPropagation()} className="modal-enter" style={{
        background: "#fff", borderRadius: 22, width: "100%", maxWidth: 620,
        boxShadow: SHADOWS["2xl"], display: "flex", flexDirection: "column",
        maxHeight: "calc(100vh - 48px)", overflow: "hidden",
      }}>

        {/* En-tête fixe */}
        <div style={{
          padding: "20px 22px 16px",
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
          background: "linear-gradient(135deg,#0f172a,#1e3a5f)",
          borderRadius: "22px 22px 0 0",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1.05rem", color: "#fff", marginBottom: 4 }}>
                🔒 Politique de Confidentialité
              </div>
              <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.55)" }}>
                ARSTM Campus · Version 1.0 · Dernière mise à jour : 03/07/2026
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: "50%", border: "none",
              background: "rgba(255,255,255,0.15)", color: "#fff",
              cursor: "pointer", fontSize: "0.9rem", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,255,255,0.08)", borderRadius: 10, fontSize: "0.77rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.55 }}>
            Applicable dans le cadre de la phase de test d'ARSTM Campus. Conforme à la Loi n°2013-450 de Côte d'Ivoire relative à la protection des données personnelles (ARTCI).
          </div>
        </div>

        {/* Corps scrollable */}
        <div style={{ overflowY: "auto", flex: 1, padding: "22px 22px 0" }}>
          {SECTIONS.map(s => <SectionBlock key={s.num} s={s} />)}
          <div style={{ height: 16 }} />
        </div>

        {/* Pied fixe */}
        <div style={{
          padding: "16px 22px 20px",
          borderTop: `1px solid ${C.border}`,
          flexShrink: 0,
          display: "flex",
          gap: 10,
        }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${C.border}`,
            background: "#fff", color: C.mid, cursor: "pointer",
            fontFamily: "inherit", fontWeight: 600, fontSize: "0.86rem",
          }}>
            Fermer
          </button>
          {onAccept && (
            <button onClick={() => { onAccept(); onClose(); }} style={{
              flex: 2, padding: "12px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg,#2563eb,#0891b2)",
              color: "#fff", cursor: "pointer",
              fontFamily: "inherit", fontWeight: 700, fontSize: "0.86rem",
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}>
              ✓ J'accepte la politique de confidentialité
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
