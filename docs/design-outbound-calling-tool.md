# Design : Outil d'Outbound Calling IA pour Recouvrement de Loyers

Généré par /office-hours le 2026-04-01
Status: APPROVED
Mode: Startup

## Problem Statement

Les agences immobilières en Belgique qui gèrent des dizaines à des centaines de lots ont des employées qui passent des heures chaque semaine à appeler manuellement des locataires en retard de loyer. Le process est répétitif, scriptable, et génère peu de valeur par rapport au coût horaire des employées.

Client identifié : agence immobilière 50-500 lots, 2 employées dédiées aux relances téléphoniques, coût estimé €800-1000/mois pour une tâche automatisable.

## Demand Evidence

- Des entreprises sont prêtes à payer pour ce service
- Des prospects demandent activement quand l'outil sera prêt
- Le fondateur a une boîte existante et veut ajouter ce produit à son offre
- Un client concret identifié avec une douleur mesurable (2 employées, plusieurs heures/semaine)

## Status Quo — Le Process Actuel

1. Un CRM métier génère quotidiennement/hebdo une liste de locataires dont la `due_date` est dépassée
2. Chaque entrée contient : nom du locataire, adresse du bien, numéro de téléphone, montant dû, date d'échéance
3. Les 2 employées se répartissent la liste (dizaines de noms)
4. Elles appellent chaque numéro séquentiellement avec un script quasi identique :
   > "Bonjour, je vous appelle par rapport au loyer de votre appartement situé au [adresse] pour lequel un loyer de [montant]€ était dû au [date d'échéance]."
5. Selon la réponse du locataire, 3 branches :
   - **"Je vais payer"** → l'employée note, vérifie dans 2 jours si le paiement est arrivé
   - **"Je ne sais pas quand"** → relance par email
   - **Pas de réponse / refus** → escalade huissier + lettre recommandée
6. Ce cycle se répète chaque semaine

## Target User

Les employées d'agences immobilières belges qui passent des heures à faire des appels de relance répétitifs. Le décideur est le gérant d'agence qui voit le coût horaire vs. la valeur créée.

## Narrowest Wedge (Phase 1 du MVP)

Appels automatiques de 1ère relance + retour de statut structuré. L'agence upload un CSV, l'IA appelle, les résultats apparaissent dans un dashboard simple. La phase 2 ajoute les séquences multi-relances et le suivi automatique.

## Contraintes

- Marché : Belgique (français + néerlandais à terme)
- Réglementation : RGPD applicable mais secondaire dans la pratique du marché
- Tech existante : le fondateur utilise déjà OpenAI Realtime + SIP + DIDWW pour de l'inbound calling dans un autre outil
- Pas d'intégration CRM requise au MVP : l'outil est une tab en plus, pas un plugin

## Landscape

### Concurrents directs (recouvrement par IA voice)

| Concurrent | Marché | Résultats |
|-----------|--------|-----------|
| Aloro.ai | Roumanie/Moldavie | +1M€ collectés en 4 mois, agents 100% autonomes |
| Chaseit | International | Milliers d'appels simultanés, 48+ langues |
| Brilo AI | International | Collection + reminders 24/7 |
| WordWorks AI | Inde/GCC | BFSI collections, compliance-first |
| Voxfit | International | Plans de paiement automatisés |

**Aucun de ces acteurs ne cible spécifiquement la Belgique ou les agences immobilières francophones.** Le marché belge est peu développé sur ce segment.

### APIs Voice évaluées

| API | Prix/min | Latence | Notes |
|-----|----------|---------|-------|
| **OpenAI Realtime** (choisi) | ~$0.15-0.20 | ~200ms | Speech-to-speech, function calling natif, déjà utilisé en inbound |
| ElevenLabs Conv. AI | ~$0.088 | Bonne | 2x moins cher, 3000+ voix, pas de vendor lock-in LLM |
| Google Gemini Live | Compétitif | Bonne | 70 langues, actif en 2026 |
| Pipeline custom (Deepgram+LLM+TTS) | Variable | Cumulée | Contrôle total, plus complexe |

**Choix tech : OpenAI Realtime + SIP + DIDWW** — le fondateur maîtrise déjà cette stack en inbound. Migration possible vers ElevenLabs si le coût/minute devient un problème à l'échelle.

## Architecture Technique

### Stack

- **Voice** : OpenAI Realtime API (speech-to-speech + function calling)
- **Téléphonie** : DIDWW SIP trunk (outbound)
- **Backend** : Python + FastAPI (le fondateur utilise déjà cette stack avec OpenAI Realtime)
- **Frontend** : Web app (Next.js ou simple HTML/JS selon préférence)
- **Database** : Supabase (PostgreSQL managé + auth + realtime intégrés)
- **Hosting** : à définir après POC (Supabase gère la DB, le backend peut tourner sur un VPS ou Railway)

### Flow d'un appel sortant

```
[Dashboard] → [Backend API] → [DIDWW SIP Outbound] → [Téléphone locataire]
                                      ↓
                              [Locataire décroche]
                                      ↓
                    [Bridge audio → OpenAI Realtime WebSocket]
                                      ↓
                         [Conversation IA + Function Calling]
                                      ↓
                    [Statut mis à jour : payera / refuse / pas répondu]
                                      ↓
                         [Dashboard mis à jour (polling phase 1, SSE phase 2)]
```

### Détail du bridge audio (outbound via SIP)

OpenAI Realtime SIP ne supporte que l'inbound nativement. Pour l'outbound :

1. Le backend initie l'appel via l'API DIDWW SIP trunk (outbound trunk)
2. Quand le locataire décroche, le serveur bridge le flux audio vers OpenAI Realtime via WebSocket
3. OpenAI reçoit l'audio, répond, et exécute les function calls
4. Le serveur forward les réponses audio d'OpenAI vers le SIP stream
5. Pattern identique à l'inbound mais initié côté serveur

### Function Calling — Actions pendant l'appel

L'agent IA dispose de ces fonctions appelables pendant la conversation :

**Phase 1 (MVP) :**
- `update_tenant_status(tenant_id, status, notes)` — met à jour le statut (will_pay, cant_pay, no_answer, voicemail, bad_number, busy, refuses) et enregistre les détails (montant promis, date promise, raison du refus)

**Phase 2 (ajouts) :**
- `schedule_followup(tenant_id, date, type)` — programme une relance automatique (appel, email)
- `mark_no_answer(tenant_id, attempt_number)` — enregistre un non-réponse et programme le retry auto

## Approche Retenue : "L'Outil" — Web App Complète

### MVP Phase 1 (semaines 1-2) — Valider que l'IA appelle et que le client adopte

1. **Import de liste** — upload CSV (nom, adresse, tel, montant, date d'échéance)
2. **Lancement de campagne** — sélection des contacts, horaires d'appel (défaut : lun-ven 9h-18h)
3. **Appels automatiques de 1ère relance** — l'IA appelle chaque numéro, suit le script
4. **Résultats structurés** — pour chaque appel : statut, résumé, promesse de paiement
5. **Dashboard simple** — liste des appels avec statuts (polling, pas de temps réel)
6. **Auth basique** — un compte par agence, login email/password

### MVP Phase 2 (semaines 3-4) — Séquences et suivi

7. **Séquences de relance automatiques** — 2ème et 3ème appels programmés automatiquement
8. **Notifications** — alerte à l'agence quand une promesse de paiement n'est pas tenue
9. **Dashboard temps réel** — via Server-Sent Events (SSE) pour les appels en cours
10. **Historique par locataire** — timeline de toutes les interactions

### V2 (post-validation client)

- Intégration CRM directe (API du CRM immo)
- Envoi automatique d'emails de relance (au MVP, l'email est une notification manuelle dans le dashboard)
- Génération de courriers recommandés
- Multilangue (néerlandais)
- Analytics : taux de recouvrement, temps moyen de paiement post-appel
- Multi-agence (SaaS multi-tenant)
- Transfert vers humain en cours d'appel (SIP transfer)

## Script IA — Exemple de conversation

```
IA : "Bonjour, je vous appelle de la part de l'agence [nom_agence] concernant 
      votre loyer pour l'appartement situé au [adresse]. Un montant de [montant]€ 
      était attendu pour le [date_echeance] et nous n'avons pas encore reçu 
      le paiement. Pouvez-vous me dire quand vous comptez effectuer le règlement ?"

Locataire : "Oui oui, j'ai eu un souci ce mois-ci, je vais payer vendredi."

IA : "D'accord, je note que vous prévoyez de régler vendredi [date]. 
      Nous vérifierons la réception du paiement. Si vous avez des 
      difficultés, n'hésitez pas à contacter l'agence au [numero_agence]. 
      Bonne journée !"

→ Function call : update_tenant_status(tenant_id, "will_pay", "Promet de payer vendredi, montant: X€")
  (Phase 1 : le statut inclut les infos de promesse. Phase 2 : schedule_followup automatise la vérification)
```

## Séquences de Relance

| Phase | Timing | Action | Déclencheur |
|-------|--------|--------|-------------|
| 1 | J+0 après due_date | Appel IA 1ère relance | Liste CRM |
| 2 | J+3 si "will_pay" | Vérification paiement | Pas de paiement reçu |
| 3 | J+7 | Appel IA 2ème relance | Toujours impayé |
| 4 | J+14 | Email de relance formelle | Toujours impayé |
| 5 | J+21 | Appel IA 3ème relance (ton plus ferme) | Toujours impayé |
| 6 | J+30 | Escalade huissier / lettre recommandée | Toujours impayé |

## Mapping Statuts

| Réponse locataire | Statut produit | Action suivante |
|-------------------|----------------|-----------------|
| "Je vais payer [date]" | `will_pay` | Vérification paiement à date+2j |
| "Je ne sais pas quand" / difficultés | `cant_pay` | Relance J+7, puis email J+14 |
| Pas de réponse | `no_answer` | Retry J+2, max 3 tentatives |
| Répondeur | `voicemail` | Pas de message (MVP), retry J+1 |
| Numéro invalide / hors service | `bad_number` | Flag pour vérification manuelle |
| Ligne occupée | `busy` | Retry dans 2h, max 3 tentatives |
| Refuse catégoriquement | `refuses` | Escalade manuelle (notification à l'agence) |

## Cas limites téléphonie

| Situation | Comportement |
|-----------|-------------|
| Répondeur détecté | Raccrocher, marquer `voicemail`, retry plus tard |
| Coupure en cours d'appel | Marquer `call_dropped`, retry dans 1h |
| Pas de décrochage après 30s | Marquer `no_answer` |
| Numéro invalide (SIP error 404/604) | Marquer `bad_number` |
| Appels simultanés max | File d'attente, limiter à 5 appels simultanés au MVP |
| Panne OpenAI | Pause campagne, notification admin, retry auto quand l'API revient |
| Panne DIDWW | Idem |

## Open Questions

1. **Quel CRM utilisent-ils exactement ?** Même si on n'intègre pas au MVP, connaître le format d'export aide
2. **Horaires d'appel légaux en Belgique ?** Vérifier les restrictions sur les appels automatisés
3. **Détection répondeur** — que faire quand ça tombe sur une messagerie ? Laisser un message ou rappeler ?
4. **Consentement** — le locataire a-t-il consenti à être appelé par un système automatisé dans son bail ?
5. **Voix** — masculine ou féminine ? Accent belge ou français standard ?
6. **Volume** — combien d'appels par semaine pour ce premier client ?

## Success Criteria

- Le premier client utilise l'outil pour ses relances hebdomadaires
- Les 2 employées passent <30% du temps qu'elles passaient avant sur les relances
- Taux de promesse de paiement ≥ au taux actuel (l'IA ne doit pas faire pire qu'un humain)
- Le client renouvelle après le premier mois

## Distribution

- Web app SaaS accessible par navigateur
- Onboarding accompagné (le sur-mesure que tu vends)
- Facturation mensuelle par volume d'appels ou forfait

## Dependencies

- Compte DIDWW avec outbound trunk configuré (existant)
- Clé API OpenAI avec accès Realtime (existant)
- Numéro de téléphone sortant identifiable (l'agence ne veut pas que ses locataires reçoivent un appel d'un numéro inconnu)

## The Assignment

**Avant de coder quoi que ce soit** : appelle ton client de l'agence immo et demande-lui de t'envoyer un export de sa liste de locataires en retard (anonymisé si nécessaire). Tu as besoin de voir le format réel des données : quels champs, quels formats de numéro, quels montants typiques. C'est ça qui va dicter la structure de ton import CSV et le prompt de ton agent IA.

Deuxième chose : fais un appel test toi-même avec OpenAI Realtime + DIDWW en outbound. Tu sais faire l'inbound, vérifie que l'outbound marche aussi proprement. Un appel vers ton propre numéro avec le script de relance. Si ça sonne bien, t'as ton POC en un après-midi.
