"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Lightweight i18n for the static site (no next-intl / routing needed).
// One React context holds the active language; t() looks the string up in the
// dictionary below. Danish is the source language and also the SSR/export
// default, so the baked HTML is Danish; the browser language + a saved choice
// take over on mount (see I18nProvider).
// ---------------------------------------------------------------------------

export const LANGS = [
  { code: "da", label: "DA", native: "Dansk" },
  { code: "en", label: "EN", native: "English" },
  { code: "de", label: "DE", native: "Deutsch" },
];

export const DEFAULT_LANG = "da";
const STORAGE_KEY = "wscc_lang";
const LOCALES = { da: "da-DK", en: "en-GB", de: "de-DE" };
export const localeOf = (lang) => LOCALES[lang] || LOCALES.da;

// The full dictionary. Keys are grouped by area; values may contain {vars}.
const M = {
  da: {
    lang: { switch: "Skift sprog", current: "Sprog: {name}" },
    nav: {
      crew: "Crewet", garage: "Garagen", members: "Medlemmer", meets: "Meets",
      calendar: "Kalender", map: "Kort", instagram: "Instagram",
      myProfile: "Min profil", login: "Log ind", crewChat: "Crew chat",
      uploadPhotos: "Upload billeder", leaderboard: "Leaderboard", parts: "Reservedelskatalog", dashboard: "Dashboard", admin: "Admin",
      logout: "Log ud", viewProfile: "Se din profil", joinCrew: "Bliv en del af crewet",
      openMenu: "Åbn menu", closeMenu: "Luk menu", toTop: "West Side Car Crew — til toppen",
      settings: "Indstillinger", themeLight: "Lyst tema", themeDark: "Mørkt tema",
      install: "Installér app", installed: "App installeret ✓",
      iosHint: "Installér: tryk Del-knappen i Safari → “Føj til hjemmeskærm”.",
      notifOn: "Slå notifikationer fra", notifOff: "Slå notifikationer til",
      notifDenied: "Notifikationer er blokeret i browseren",
      notifUnsupported: "Notifikationer understøttes ikke her",
      notifWorking: "Vent…", notifSetup: "Notifikationer er ikke sat op endnu",
    },
    hero: {
      overline: "Est. 2022 — Esbjerg × Fredericia",
      sub: "En flok venner fra vestkysten. Ni biler, én garage — forenet af benzin, saltluft og respekt for hinandens projekter.",
      cars: "Biler i garagen", founded: "Grundlagt", photos: "Billeder", scroll: "Scroll",
      imgAlt: "Mineralgrå BMW M4 på guldfælge foran Lillebæltsbroen ved solnedgang",
      scrollAria: "Scroll ned til crewet",
    },
    about: {
      overline: "Crewet",
      leadA: "Vi mødtes over bilerne — og blev for ", leadEm: "hinanden", leadB: ".",
      p1: "West Side Car Crew startede i 2022 i Esbjerg: en flok venner fra havnebyen, hver med deres egen smag i hestekræfter. Ingen klub, ingen kontingent — bare et fællesskab bygget på fælles passion og sene aftener i garagen.",
      p2: "I dag strækker crewet sig fra vestkysten til Fredericia, og garagen spænder vidt: klassisk amerikansk jern, en japansk ikon, tysk ingeniørkunst og rå V8. Forskellige biler, samme crew.",
      founded: "Grundlagt", cars: "Biler", esbFreSub: "Esbjerg · Fredericia",
      figCaption: "Lillebælt · Golden hour", figAlt: "Nissan GT-R ved Lillebæltsbroen",
    },
    garage: {
      overline: "Garagen", title: "Ét crew, hver sin bil.",
      sub: "Fra klassisk amerikansk muskel til en japansk ikon. Tryk på en bil for at åbne dens galleri.",
      crewAlbum: "Crew-album", openAria: "Åbn galleri: {title}",
    },
    community: {
      overline: "Fra crewet", title: "Medlemmernes billeder",
      subA: "Uploadet af crewet. ", subLogin: "Log ind", subB: " for at se alle billeder og dele dine egne.",
      untitled: "Uden titel", member: "medlem", car: "Bil",
      openAria: "Åbn {name}", commentsTitle: "{n} kommentarer",
    },
    news: { overline: "Opslagstavle", title: "Nyt fra crewet", pinned: "Fastgjort" },
    footer: { followAlong: "Følg med", builtForCrew: "Bygget til crewet" },
    teaser: { overline: "Næste meet", coming: "{n} kommer", cta: "Se & tilmeld →" },
    members: {
      overline: "Crewet", title: "Medlemmer",
      intro: "{n} medlemmer. Klik ind på en profil for at se biler, byggetråde og badges.",
      empty: "Ingen medlemmer endnu.", noCars: "Ingen biler endnu",
      carsOne: "{n} bil", carsMany: "{n} biler", admin: "admin",
    },
    events: {
      overline: "Meets & events", title: "Kommende meets", newMeet: "+ Nyt meet",
      emptyTitle: "Ingen meets planlagt endnu.",
      emptyMember: "Vær den første til at planlægge et — tryk “Nyt meet”.",
      emptyGuestA: "", emptyGuestLogin: "Log ind", emptyGuestB: " for at planlægge et meet.",
      edit: "✎ Rediger", deleteMeet: "Slet meet", confirmDelete: "Slet dette meet?",
      comingN: "{n} kommer", maybeN: "{n} måske",
      yrLink: "Se timevejr for dagen på yr.no",
      loginToRsvpA: "", loginToRsvpLogin: "Log ind", loginToRsvpB: " for at svare.",
    },
    rsvp: { yes: "Kommer", maybe: "Måske", no: "Kan ikke" },
    calendar: {
      overline: "Kalender", today: "I dag", prevMonth: "Forrige måned", nextMonth: "Næste måned",
      newMeet: "+ Nyt meet", hint: "Tip: klik på en dag for at planlægge et meet den dato.",
      subscribe: "Abonnér på kalender",
      subscribeHint: "Tilføj alle meets til din kalender — nye kommer automatisk.",
      planAria: "Planlæg meet den {day}.",
      emptyA: "Ingen meets i kalenderen endnu.",
      emptyMember: " Klik på en dag eller “+ Nyt meet” for at planlægge det første.",
      emptyGuestLogin: "Log ind", emptyGuestB: " for at planlægge et.",
    },
    kort: {
      overline: "Kort", title: "Hvor holder vi meets?",
      intro: "Klik på en markør for at se detaljer og tilmelde dig. Sæt en nål på et meet når du opretter det.",
      empty: "Ingen meets med kort-placering endnu.",
      emptyMember: " Sæt en nål når du opretter et meet i kalenderen.",
      noPinLabel: "Meets uden kort-placering",
    },
    login: {
      home: "← West Side Car Crew",
      titleLogin: "Log ind", titleSignup: "Bliv medlem", titleForgot: "Nulstil adgangskode",
      subLogin: "Log ind for at se og uploade billeder.",
      subSignupInvited: "Du er inviteret ✨ Koden er udfyldt — vælg bare brugernavn, email og adgangskode.",
      subSignup: "Opret din profil med crewets kode.",
      subForgot: "Indtast din email, så sender vi et link til at vælge en ny adgangskode.",
      tabLogin: "Log ind", tabSignup: "Opret",
      username: "Brugernavn", email: "Email", password: "Adgangskode",
      code: "Oprettelses-kode", codePlaceholder: "Crewets kode",
      wait: "Vent…", btnLogin: "Log ind", btnSignup: "Opret profil", btnForgot: "Send nulstillingslink",
      forgotLink: "Glemt adgangskode?", backToLogin: "← Tilbage til login",
      errCreds: "Forkert email eller adgangskode.",
      errUsername: "Vælg et brugernavn (mindst 2 tegn).",
      errServer: "Kunne ikke kontakte serveren. Prøv igen.",
      errCode: "Forkert kode. Du skal bruge crewets oprettelses-kode.",
      errTaken: "Brugernavnet er optaget – vælg et andet.",
      errExists: "Der findes allerede en konto med den email – log ind i stedet.",
      errSignupsOff: "Oprettelse er slået fra i Supabase. Admin skal aktivere email-signups i dashboardet.",
      infoConfirm: "Konto oprettet. Bekræft din email, og log derefter ind. (Admin kan slå email-bekræftelse fra for at springe dette over.)",
      errProfile: "Kunne ikke oprette profil: ", errCodeShort: "Forkert kode.",
      infoReset: "Vi har sendt et link til at nulstille din adgangskode – tjek din indbakke (og evt. spam).",
    },
    meet: {
      tag: "Meet", close: "Luk", edit: "✎ Rediger", delete: "Slet", confirmDelete: "Slet dette meet?",
      whoComing: "Hvem kommer", noneComing: "Ingen tilmeldte endnu.",
      comingLabel: "✅ Kommer:", maybeLabel: "🤔 Måske:",
      yrLink: "Se timevejr for dagen på yr.no",
      directions: "Rutevejledning (åbn i Google Maps)",
      addToCal: "Tilføj til kalender",
      openLink: "Åbn begivenhed / link",
      fLink: "Link (fx Facebook-begivenhed)",
      loginToRsvpA: "", loginToRsvpLogin: "Log ind", loginToRsvpB: " for at tilmelde dig.",
      photosLabel: "Billeder fra meet", addPhotos: "+ Tilføj billeder", uploading: "Uploader…",
      noPhotos: "Ingen billeder endnu", noPhotosMember: " — del dine fra dagen 📸", period: ".",
      openPhoto: "Åbn billede", pending: "Afventer", pendingTitle: "Afventer godkendelse til offentlig visning",
      photoAlt: "Meet-billede", uploadError: "Kunne ikke uploade: ",
      // form
      formNewOverline: "Nyt meet", formEditOverline: "Rediger meet",
      formNewTitle: "Planlæg et meet", formEditTitle: "Rediger meet",
      fTitle: "Titel", fTitlePh: "fx Søndagscruise til havnen",
      fDate: "Dato", fTime: "Tidspunkt",
      fLocation: "Sted", fLocationPh: "fx P-plads ved Esbjerg havn",
      fMapLink: "Kort-link (valgfrit)", fDesc: "Beskrivelse", fDescPh: "Hvad sker der?",
      fMapPlace: "Placering på kort (valgfrit)", clearPin: "Ryd nål",
      pinSet: "📍 Nål sat — meetet vises på kortet.", pinHint: "Klik på kortet for at sætte en nål.",
      errRequired: "Titel og dato skal udfyldes.", saving: "Gemmer…",
      saveChanges: "Gem ændringer", createMeet: "Opret meet", cancel: "Annullér",
      wxSoon: "Vejrudsigt vises tættere på dagen", wxWind: "Vind", wxPrecip: "Nedbør",
      geoFind: "📍 Find adresse", geoSearching: "Søger…",
      geoFound: "✓ Sted fundet — nål sat, kort-link udfyldt og vejr slået til.",
      geoNotFound: "Fandt ikke stedet som nål — Google Maps-linket er udfyldt. Klik på kortet for at sætte en nål (så virker vejret).",
      geoPick: "Flere match — vælg den rigtige:",
      geoTownHead: "Vælg placering for “{q}”:",
      geoUseTown: "Brug {town} (nål i byen) + åbn søgningen på Google Maps",
      geoOrNearest: "— eller den nærmeste af samme slags:",
      geoAddrTip: "💡 Kender du adressen? Skriv den (vej, nr., postnr., by) — så sætter vi nålen præcist, også når butikken ikke er i kortet.",
      geoCapReached: "ⓘ Google-søgning er sat på pause denne måned (sidens sikkerhedsgrænse nået) — bruger kort-data i stedet.",
      geoLinkSet: "✓ Google Maps-link sat. Klik på kortet for at sætte en nål (så virker vejret).",
      geoGoogle: "🔎 Ikke det rigtige? Åbn søgningen på Google Maps",
      notComingLabel: "❌ Kommer ikke:", noReason: "(ingen begrundelse)",
      reasonLabel: "Begrundelse (valgfri, kun synlig for medlemmer)",
      reasonPh: "fx Arbejder den dag / er syg / for lang vej…",
      reasonHint: "Kun crewets medlemmer kan se den — ikke offentligt.",
      saveReason: "Gem begrundelse",
    },
    car: {
      close: "Luk profil", overline: "Bil-profil",
      claim: "🚗 Claim denne bil (den er min)", claimed: "✓ Din bil",
      year: "År", engine: "Motor", power: "Effekt", drivetrain: "Drivlinje", hp: "hk",
      mods: "Modifikationer", editSpecs: "✎ Rediger specs", closeEdit: "Luk",
      fMake: "Mærke", fModel: "Model", fYear: "Årgang", fPower: "Effekt (hk)",
      fEngine: "Motor", fDrivetrain: "Drivlinje", fMods: "Modifikationer", fVin: "VIN (stelnummer)",
      fModsPh: "Downpipe, coilovers, stage 2…", saveSpecs: "Gem specs", saving: "Gemmer…",
      catalog: "Reservedelskatalog", catalogHint: "Åbner det eksterne katalog med bilens VIN. Vi hoster ikke katalogdata — vi linker kun.",
      catalogNoVin: "Intet VIN endnu — kataloget vises når VIN er tilføjet.", catalogAddVin: "Tilføj bilens VIN under “Rediger specs” for at åbne kataloget.",
      thread: "Byggetråd", fHeadline: "Overskrift", fHeadlinePh: "fx Nye fælge",
      fDate: "Dato", fText: "Tekst", fTextPh: "Hvad blev der lavet?",
      imgChosen: "✓ Billede valgt", addImg: "+ Billede", add: "Tilføj",
      emptyThread: "Ingen byggetråd endnu", emptyThreadEdit: " — tilføj den første milepæl ✎",
      deleteEntry: "Slet", saveError: "Kunne ikke gemme: ", addError: "Kunne ikke tilføje: ",
    },
    lightbox: {
      gallery: "{title} galleri", profile: "Profil", profileAria: "Bil-profil & byggetråd",
      close: "Luk galleri", prev: "Forrige", next: "Næste", goTo: "Gå til billede {n}",
    },
    photo: {
      close: "Luk", prev: "Forrige", next: "Næste", untitled: "Uden titel",
      member: "medlem", car: "Bil", comments: "Kommentarer", gallery: "Foto-galleri",
    },
    comments: {
      empty: "Ingen kommentarer endnu — vær den første 💬",
      placeholder: "Skriv en kommentar…", loginPlaceholder: "Log ind for at kommentere",
      aria: "Kommentar", send: "Send", delete: "Slet kommentar", me: "mig", member: "medlem",
    },
    like: { remove: "Fjern like", add: "Synes godt om", loginTitle: "Log ind for at like" },
    weather: {
      clear: "Klart", fair: "Let skyet", partly: "Delvist skyet", cloudy: "Skyet", fog: "Tåge",
      lightrain: "Let regn", rain: "Regn", heavyrain: "Kraftig regn",
      lightrainshowers: "Lette regnbyger", rainshowers: "Regnbyger", heavyrainshowers: "Kraftige regnbyger",
      sleet: "Slud", sleetshowers: "Sludbyger", snow: "Sne", snowshowers: "Snebyger",
      heavysnow: "Kraftig sne", thunder: "Torden", unknown: "—",
    },
    common: { member: "Medlem", loginShort: "Log ind", back: "‹ Medlem", meetsList: "Meets-liste" },
    pushPrompt: {
      title: "Få besked om nye meets 🔔",
      body: "Slå notifikationer til, så ved du det med det samme, når der er et nyt meet eller opslag.",
      enable: "Slå til", enabling: "Vent…", later: "Ikke nu",
    },
  },

  en: {
    lang: { switch: "Change language", current: "Language: {name}" },
    nav: {
      crew: "The Crew", garage: "The Garage", members: "Members", meets: "Meets",
      calendar: "Calendar", map: "Map", instagram: "Instagram",
      myProfile: "My profile", login: "Log in", crewChat: "Crew chat",
      uploadPhotos: "Upload photos", leaderboard: "Leaderboard", parts: "Parts catalog", dashboard: "Dashboard", admin: "Admin",
      logout: "Log out", viewProfile: "View your profile", joinCrew: "Join the crew",
      openMenu: "Open menu", closeMenu: "Close menu", toTop: "West Side Car Crew — to top",
      settings: "Settings", themeLight: "Light theme", themeDark: "Dark theme",
      install: "Install app", installed: "App installed ✓",
      iosHint: "Install: tap the Share button in Safari → “Add to Home Screen”.",
      notifOn: "Turn off notifications", notifOff: "Turn on notifications",
      notifDenied: "Notifications are blocked in your browser",
      notifUnsupported: "Notifications aren’t supported here",
      notifWorking: "Please wait…", notifSetup: "Notifications aren’t set up yet",
    },
    hero: {
      overline: "Est. 2022 — Esbjerg × Fredericia",
      sub: "A group of friends from the west coast. Nine cars, one garage — united by fuel, salt air and respect for each other’s builds.",
      cars: "Cars in the garage", founded: "Founded", photos: "Photos", scroll: "Scroll",
      imgAlt: "Mineral grey BMW M4 on gold wheels in front of the Little Belt Bridge at sunset",
      scrollAria: "Scroll to the crew",
    },
    about: {
      overline: "The Crew",
      leadA: "We met over the cars — and stayed for ", leadEm: "each other", leadB: ".",
      p1: "West Side Car Crew started in 2022 in Esbjerg: a group of friends from the harbour town, each with their own taste in horsepower. No club, no membership fees — just a community built on a shared passion and late nights in the garage.",
      p2: "Today the crew stretches from the west coast to Fredericia, and the garage runs wide: classic American iron, a Japanese icon, German engineering and raw V8. Different cars, same crew.",
      founded: "Founded", cars: "Cars", esbFreSub: "Esbjerg · Fredericia",
      figCaption: "Little Belt · Golden hour", figAlt: "Nissan GT-R by the Little Belt Bridge",
    },
    garage: {
      overline: "The Garage", title: "One crew, every car.",
      sub: "From classic American muscle to a Japanese icon. Tap a car to open its gallery.",
      crewAlbum: "Crew album", openAria: "Open gallery: {title}",
    },
    community: {
      overline: "From the crew", title: "Members’ photos",
      subA: "Uploaded by the crew. ", subLogin: "Log in", subB: " to see every photo and share your own.",
      untitled: "Untitled", member: "member", car: "Car",
      openAria: "Open {name}", commentsTitle: "{n} comments",
    },
    news: { overline: "Notice board", title: "News from the crew", pinned: "Pinned" },
    footer: { followAlong: "Follow along", builtForCrew: "Built for the crew" },
    teaser: { overline: "Next meet", coming: "{n} coming", cta: "See & RSVP →" },
    members: {
      overline: "The Crew", title: "Members",
      intro: "{n} members. Click a profile to see cars, build threads and badges.",
      empty: "No members yet.", noCars: "No cars yet",
      carsOne: "{n} car", carsMany: "{n} cars", admin: "admin",
    },
    events: {
      overline: "Meets & events", title: "Upcoming meets", newMeet: "+ New meet",
      emptyTitle: "No meets planned yet.",
      emptyMember: "Be the first to plan one — hit “New meet”.",
      emptyGuestA: "", emptyGuestLogin: "Log in", emptyGuestB: " to plan a meet.",
      edit: "✎ Edit", deleteMeet: "Delete meet", confirmDelete: "Delete this meet?",
      comingN: "{n} coming", maybeN: "{n} maybe",
      yrLink: "See the hourly forecast on yr.no",
      loginToRsvpA: "", loginToRsvpLogin: "Log in", loginToRsvpB: " to respond.",
    },
    rsvp: { yes: "Coming", maybe: "Maybe", no: "Can’t" },
    calendar: {
      overline: "Calendar", today: "Today", prevMonth: "Previous month", nextMonth: "Next month",
      newMeet: "+ New meet", hint: "Tip: click a day to plan a meet on that date.",
      subscribe: "Subscribe to calendar",
      subscribeHint: "Add every meet to your calendar — new ones sync automatically.",
      planAria: "Plan a meet on the {day}.",
      emptyA: "No meets in the calendar yet.",
      emptyMember: " Click a day or “+ New meet” to plan the first one.",
      emptyGuestLogin: "Log in", emptyGuestB: " to plan one.",
    },
    kort: {
      overline: "Map", title: "Where do we meet?",
      intro: "Click a marker to see details and RSVP. Drop a pin on a meet when you create it.",
      empty: "No meets with a map location yet.",
      emptyMember: " Drop a pin when you create a meet in the calendar.",
      noPinLabel: "Meets without a map location",
    },
    login: {
      home: "← West Side Car Crew",
      titleLogin: "Log in", titleSignup: "Become a member", titleForgot: "Reset password",
      subLogin: "Log in to view and upload photos.",
      subSignupInvited: "You’re invited ✨ The code is filled in — just choose a username, email and password.",
      subSignup: "Create your profile with the crew code.",
      subForgot: "Enter your email and we’ll send a link to choose a new password.",
      tabLogin: "Log in", tabSignup: "Sign up",
      username: "Username", email: "Email", password: "Password",
      code: "Sign-up code", codePlaceholder: "The crew code",
      wait: "Wait…", btnLogin: "Log in", btnSignup: "Create profile", btnForgot: "Send reset link",
      forgotLink: "Forgot password?", backToLogin: "← Back to login",
      errCreds: "Wrong email or password.",
      errUsername: "Choose a username (at least 2 characters).",
      errServer: "Couldn’t reach the server. Try again.",
      errCode: "Wrong code. You need the crew’s sign-up code.",
      errTaken: "That username is taken – choose another.",
      errExists: "An account with that email already exists – log in instead.",
      errSignupsOff: "Sign-ups are disabled in Supabase. An admin must enable email sign-ups in the dashboard.",
      infoConfirm: "Account created. Confirm your email, then log in. (An admin can turn email confirmation off to skip this.)",
      errProfile: "Couldn’t create profile: ", errCodeShort: "Wrong code.",
      infoReset: "We’ve sent a link to reset your password – check your inbox (and spam).",
    },
    meet: {
      tag: "Meet", close: "Close", edit: "✎ Edit", delete: "Delete", confirmDelete: "Delete this meet?",
      whoComing: "Who’s coming", noneComing: "No RSVPs yet.",
      comingLabel: "✅ Coming:", maybeLabel: "🤔 Maybe:",
      yrLink: "See the hourly forecast on yr.no",
      directions: "Directions (open in Google Maps)",
      addToCal: "Add to calendar",
      openLink: "Open event / link",
      fLink: "Link (e.g. Facebook event)",
      loginToRsvpA: "", loginToRsvpLogin: "Log in", loginToRsvpB: " to RSVP.",
      photosLabel: "Photos from the meet", addPhotos: "+ Add photos", uploading: "Uploading…",
      noPhotos: "No photos yet", noPhotosMember: " — share yours from the day 📸", period: ".",
      openPhoto: "Open photo", pending: "Pending", pendingTitle: "Awaiting approval for public display",
      photoAlt: "Meet photo", uploadError: "Couldn’t upload: ",
      formNewOverline: "New meet", formEditOverline: "Edit meet",
      formNewTitle: "Plan a meet", formEditTitle: "Edit meet",
      fTitle: "Title", fTitlePh: "e.g. Sunday cruise to the harbour",
      fDate: "Date", fTime: "Time",
      fLocation: "Location", fLocationPh: "e.g. Car park at Esbjerg harbour",
      fMapLink: "Map link (optional)", fDesc: "Description", fDescPh: "What’s happening?",
      fMapPlace: "Location on the map (optional)", clearPin: "Clear pin",
      pinSet: "📍 Pin set — the meet shows on the map.", pinHint: "Click the map to drop a pin.",
      errRequired: "Title and date are required.", saving: "Saving…",
      saveChanges: "Save changes", createMeet: "Create meet", cancel: "Cancel",
      wxSoon: "Forecast shows closer to the day", wxWind: "Wind", wxPrecip: "Precipitation",
      geoFind: "📍 Find address", geoSearching: "Searching…",
      geoFound: "✓ Place found — pin set, map link filled in and weather enabled.",
      geoNotFound: "Couldn't pin the place — the Google Maps link is filled in. Click the map to drop a pin (so the weather works).",
      geoPick: "Several matches — pick the right one:",
      geoTownHead: "Choose a location for “{q}”:",
      geoUseTown: "Use {town} (pin the town) + open the search on Google Maps",
      geoOrNearest: "— or the nearest of the same kind:",
      geoAddrTip: "💡 Know the address? Type it (street, no., postcode, town) — we'll pin it exactly, even when the shop isn't on the map.",
      geoCapReached: "ⓘ Google search is paused this month (the site's safety limit was reached) — using map data instead.",
      geoLinkSet: "✓ Google Maps link set. Click the map to drop a pin (so the weather works).",
      geoGoogle: "🔎 Not the right one? Open the search on Google Maps",
      notComingLabel: "❌ Not coming:", noReason: "(no reason given)",
      reasonLabel: "Reason (optional, members only)",
      reasonPh: "e.g. Working that day / sick / too far…",
      reasonHint: "Only crew members can see it — not public.",
      saveReason: "Save reason",
    },
    car: {
      close: "Close profile", overline: "Car profile",
      claim: "🚗 Claim this car (it’s mine)", claimed: "✓ Your car",
      year: "Year", engine: "Engine", power: "Power", drivetrain: "Drivetrain", hp: "hp",
      mods: "Modifications", editSpecs: "✎ Edit specs", closeEdit: "Close",
      fMake: "Make", fModel: "Model", fYear: "Year", fPower: "Power (hp)",
      fEngine: "Engine", fDrivetrain: "Drivetrain", fMods: "Modifications", fVin: "VIN (chassis no.)",
      fModsPh: "Downpipe, coilovers, stage 2…", saveSpecs: "Save specs", saving: "Saving…",
      catalog: "Parts catalog", catalogHint: "Opens the external catalog with the car's VIN. We don't host catalog data — we only link out.",
      catalogNoVin: "No VIN yet — the catalog appears once a VIN is added.", catalogAddVin: "Add the car's VIN under “Edit specs” to open the catalog.",
      thread: "Build thread", fHeadline: "Headline", fHeadlinePh: "e.g. New wheels",
      fDate: "Date", fText: "Text", fTextPh: "What was done?",
      imgChosen: "✓ Image selected", addImg: "+ Image", add: "Add",
      emptyThread: "No build thread yet", emptyThreadEdit: " — add the first milestone ✎",
      deleteEntry: "Delete", saveError: "Couldn’t save: ", addError: "Couldn’t add: ",
    },
    lightbox: {
      gallery: "{title} gallery", profile: "Profile", profileAria: "Car profile & build thread",
      close: "Close gallery", prev: "Previous", next: "Next", goTo: "Go to image {n}",
    },
    photo: {
      close: "Close", prev: "Previous", next: "Next", untitled: "Untitled",
      member: "member", car: "Car", comments: "Comments", gallery: "Photo gallery",
    },
    comments: {
      empty: "No comments yet — be the first 💬",
      placeholder: "Write a comment…", loginPlaceholder: "Log in to comment",
      aria: "Comment", send: "Send", delete: "Delete comment", me: "me", member: "member",
    },
    like: { remove: "Remove like", add: "Like", loginTitle: "Log in to like" },
    weather: {
      clear: "Clear", fair: "Fair", partly: "Partly cloudy", cloudy: "Cloudy", fog: "Fog",
      lightrain: "Light rain", rain: "Rain", heavyrain: "Heavy rain",
      lightrainshowers: "Light showers", rainshowers: "Showers", heavyrainshowers: "Heavy showers",
      sleet: "Sleet", sleetshowers: "Sleet showers", snow: "Snow", snowshowers: "Snow showers",
      heavysnow: "Heavy snow", thunder: "Thunder", unknown: "—",
    },
    common: { member: "Member", loginShort: "Log in", back: "‹ Member", meetsList: "Meets list" },
    pushPrompt: {
      title: "Get notified about new meets 🔔",
      body: "Turn on notifications so you know the moment there's a new meet or post.",
      enable: "Turn on", enabling: "Wait…", later: "Not now",
    },
  },

  de: {
    lang: { switch: "Sprache ändern", current: "Sprache: {name}" },
    nav: {
      crew: "Die Crew", garage: "Die Garage", members: "Mitglieder", meets: "Meets",
      calendar: "Kalender", map: "Karte", instagram: "Instagram",
      myProfile: "Mein Profil", login: "Anmelden", crewChat: "Crew-Chat",
      uploadPhotos: "Fotos hochladen", leaderboard: "Bestenliste", parts: "Ersatzteilkatalog", dashboard: "Dashboard", admin: "Admin",
      logout: "Abmelden", viewProfile: "Dein Profil ansehen", joinCrew: "Teil der Crew werden",
      openMenu: "Menü öffnen", closeMenu: "Menü schließen", toTop: "West Side Car Crew — nach oben",
      settings: "Einstellungen", themeLight: "Helles Design", themeDark: "Dunkles Design",
      install: "App installieren", installed: "App installiert ✓",
      iosHint: "Installieren: Teilen-Symbol in Safari → „Zum Home-Bildschirm“.",
      notifOn: "Benachrichtigungen aus", notifOff: "Benachrichtigungen an",
      notifDenied: "Benachrichtigungen sind im Browser blockiert",
      notifUnsupported: "Benachrichtigungen werden hier nicht unterstützt",
      notifWorking: "Bitte warten…", notifSetup: "Benachrichtigungen sind noch nicht eingerichtet",
    },
    hero: {
      overline: "Gegr. 2022 — Esbjerg × Fredericia",
      sub: "Eine Gruppe Freunde von der Westküste. Neun Autos, eine Garage — vereint durch Benzin, Salzluft und Respekt für die Projekte der anderen.",
      cars: "Autos in der Garage", founded: "Gegründet", photos: "Fotos", scroll: "Scrollen",
      imgAlt: "Mineralgrauer BMW M4 auf goldenen Felgen vor der Kleinen-Belt-Brücke bei Sonnenuntergang",
      scrollAria: "Zur Crew scrollen",
    },
    about: {
      overline: "Die Crew",
      leadA: "Wir trafen uns über die Autos — und blieben für ", leadEm: "einander", leadB: ".",
      p1: "West Side Car Crew begann 2022 in Esbjerg: eine Gruppe Freunde aus der Hafenstadt, jeder mit seinem eigenen Geschmack an Pferdestärken. Kein Verein, keine Mitgliedsbeiträge — nur eine Gemeinschaft, gebaut auf gemeinsamer Leidenschaft und langen Nächten in der Garage.",
      p2: "Heute reicht die Crew von der Westküste bis Fredericia, und die Garage ist breit aufgestellt: klassisches amerikanisches Eisen, eine japanische Ikone, deutsche Ingenieurskunst und roher V8. Verschiedene Autos, dieselbe Crew.",
      founded: "Gegründet", cars: "Autos", esbFreSub: "Esbjerg · Fredericia",
      figCaption: "Kleiner Belt · Goldene Stunde", figAlt: "Nissan GT-R an der Kleinen-Belt-Brücke",
    },
    garage: {
      overline: "Die Garage", title: "Eine Crew, jedes Auto.",
      sub: "Von klassischem amerikanischem Muscle bis zur japanischen Ikone. Tippe auf ein Auto, um seine Galerie zu öffnen.",
      crewAlbum: "Crew-Album", openAria: "Galerie öffnen: {title}",
    },
    community: {
      overline: "Von der Crew", title: "Fotos der Mitglieder",
      subA: "Hochgeladen von der Crew. ", subLogin: "Anmelden", subB: ", um alle Fotos zu sehen und eigene zu teilen.",
      untitled: "Ohne Titel", member: "Mitglied", car: "Auto",
      openAria: "{name} öffnen", commentsTitle: "{n} Kommentare",
    },
    news: { overline: "Pinnwand", title: "Neues von der Crew", pinned: "Angeheftet" },
    footer: { followAlong: "Folge uns", builtForCrew: "Für die Crew gebaut" },
    teaser: { overline: "Nächstes Meet", coming: "{n} kommen", cta: "Ansehen & zusagen →" },
    members: {
      overline: "Die Crew", title: "Mitglieder",
      intro: "{n} Mitglieder. Klick auf ein Profil, um Autos, Build-Threads und Badges zu sehen.",
      empty: "Noch keine Mitglieder.", noCars: "Noch keine Autos",
      carsOne: "{n} Auto", carsMany: "{n} Autos", admin: "Admin",
    },
    events: {
      overline: "Meets & Events", title: "Kommende Meets", newMeet: "+ Neues Meet",
      emptyTitle: "Noch keine Meets geplant.",
      emptyMember: "Sei der Erste, der eins plant — tippe auf „Neues Meet“.",
      emptyGuestA: "", emptyGuestLogin: "Anmelden", emptyGuestB: ", um ein Meet zu planen.",
      edit: "✎ Bearbeiten", deleteMeet: "Meet löschen", confirmDelete: "Dieses Meet löschen?",
      comingN: "{n} kommen", maybeN: "{n} vielleicht",
      yrLink: "Stündliche Vorhersage auf yr.no ansehen",
      loginToRsvpA: "", loginToRsvpLogin: "Anmelden", loginToRsvpB: ", um zu antworten.",
    },
    rsvp: { yes: "Komme", maybe: "Vielleicht", no: "Kann nicht" },
    calendar: {
      overline: "Kalender", today: "Heute", prevMonth: "Voriger Monat", nextMonth: "Nächster Monat",
      newMeet: "+ Neues Meet", hint: "Tipp: Klick auf einen Tag, um an dem Datum ein Meet zu planen.",
      subscribe: "Kalender abonnieren",
      subscribeHint: "Alle Meets in deinen Kalender — neue kommen automatisch dazu.",
      planAria: "Meet am {day}. planen.",
      emptyA: "Noch keine Meets im Kalender.",
      emptyMember: " Klick auf einen Tag oder „+ Neues Meet“, um das erste zu planen.",
      emptyGuestLogin: "Anmelden", emptyGuestB: ", um eins zu planen.",
    },
    kort: {
      overline: "Karte", title: "Wo treffen wir uns?",
      intro: "Klick auf eine Markierung für Details und zum Zusagen. Setz beim Erstellen eine Nadel auf ein Meet.",
      empty: "Noch keine Meets mit Kartenstandort.",
      emptyMember: " Setz eine Nadel, wenn du ein Meet im Kalender erstellst.",
      noPinLabel: "Meets ohne Kartenstandort",
    },
    login: {
      home: "← West Side Car Crew",
      titleLogin: "Anmelden", titleSignup: "Mitglied werden", titleForgot: "Passwort zurücksetzen",
      subLogin: "Melde dich an, um Fotos zu sehen und hochzuladen.",
      subSignupInvited: "Du bist eingeladen ✨ Der Code ist ausgefüllt — wähle nur Benutzername, E-Mail und Passwort.",
      subSignup: "Erstelle dein Profil mit dem Crew-Code.",
      subForgot: "Gib deine E-Mail ein, wir senden dir einen Link für ein neues Passwort.",
      tabLogin: "Anmelden", tabSignup: "Registrieren",
      username: "Benutzername", email: "E-Mail", password: "Passwort",
      code: "Registrierungscode", codePlaceholder: "Der Crew-Code",
      wait: "Moment…", btnLogin: "Anmelden", btnSignup: "Profil erstellen", btnForgot: "Reset-Link senden",
      forgotLink: "Passwort vergessen?", backToLogin: "← Zurück zur Anmeldung",
      errCreds: "Falsche E-Mail oder Passwort.",
      errUsername: "Wähle einen Benutzernamen (mindestens 2 Zeichen).",
      errServer: "Server nicht erreichbar. Versuch es erneut.",
      errCode: "Falscher Code. Du brauchst den Registrierungscode der Crew.",
      errTaken: "Dieser Benutzername ist vergeben – wähle einen anderen.",
      errExists: "Es existiert bereits ein Konto mit dieser E-Mail – melde dich stattdessen an.",
      errSignupsOff: "Registrierungen sind in Supabase deaktiviert. Ein Admin muss E-Mail-Registrierungen im Dashboard aktivieren.",
      infoConfirm: "Konto erstellt. Bestätige deine E-Mail und melde dich dann an. (Ein Admin kann die E-Mail-Bestätigung deaktivieren.)",
      errProfile: "Profil konnte nicht erstellt werden: ", errCodeShort: "Falscher Code.",
      infoReset: "Wir haben dir einen Link zum Zurücksetzen geschickt – prüf dein Postfach (und Spam).",
    },
    meet: {
      tag: "Meet", close: "Schließen", edit: "✎ Bearbeiten", delete: "Löschen", confirmDelete: "Dieses Meet löschen?",
      whoComing: "Wer kommt", noneComing: "Noch keine Zusagen.",
      comingLabel: "✅ Kommt:", maybeLabel: "🤔 Vielleicht:",
      yrLink: "Stündliche Vorhersage auf yr.no ansehen",
      directions: "Route (in Google Maps öffnen)",
      addToCal: "Zum Kalender hinzufügen",
      openLink: "Event / Link öffnen",
      fLink: "Link (z. B. Facebook-Event)",
      loginToRsvpA: "", loginToRsvpLogin: "Anmelden", loginToRsvpB: ", um zuzusagen.",
      photosLabel: "Fotos vom Meet", addPhotos: "+ Fotos hinzufügen", uploading: "Wird hochgeladen…",
      noPhotos: "Noch keine Fotos", noPhotosMember: " — teile deine vom Tag 📸", period: ".",
      openPhoto: "Foto öffnen", pending: "Ausstehend", pendingTitle: "Wartet auf Freigabe für die öffentliche Anzeige",
      photoAlt: "Meet-Foto", uploadError: "Hochladen fehlgeschlagen: ",
      formNewOverline: "Neues Meet", formEditOverline: "Meet bearbeiten",
      formNewTitle: "Ein Meet planen", formEditTitle: "Meet bearbeiten",
      fTitle: "Titel", fTitlePh: "z. B. Sonntagscruise zum Hafen",
      fDate: "Datum", fTime: "Uhrzeit",
      fLocation: "Ort", fLocationPh: "z. B. Parkplatz am Hafen Esbjerg",
      fMapLink: "Karten-Link (optional)", fDesc: "Beschreibung", fDescPh: "Was passiert?",
      fMapPlace: "Standort auf der Karte (optional)", clearPin: "Nadel entfernen",
      pinSet: "📍 Nadel gesetzt — das Meet erscheint auf der Karte.", pinHint: "Klick auf die Karte, um eine Nadel zu setzen.",
      errRequired: "Titel und Datum sind erforderlich.", saving: "Wird gespeichert…",
      saveChanges: "Änderungen speichern", createMeet: "Meet erstellen", cancel: "Abbrechen",
      wxSoon: "Vorhersage erscheint näher am Tag", wxWind: "Wind", wxPrecip: "Niederschlag",
      geoFind: "📍 Adresse finden", geoSearching: "Suche…",
      geoFound: "✓ Ort gefunden — Nadel gesetzt, Karten-Link ausgefüllt und Wetter aktiviert.",
      geoNotFound: "Ort nicht als Nadel gefunden — der Google-Maps-Link ist ausgefüllt. Klick auf die Karte, um eine Nadel zu setzen (damit das Wetter funktioniert).",
      geoPick: "Mehrere Treffer — wähle den richtigen:",
      geoTownHead: "Wähle einen Ort für „{q}“:",
      geoUseTown: "{town} verwenden (Nadel in der Stadt) + Suche in Google Maps öffnen",
      geoOrNearest: "— oder das nächste derselben Art:",
      geoAddrTip: "💡 Kennst du die Adresse? Gib sie ein (Straße, Nr., PLZ, Ort) — wir setzen die Nadel genau, auch wenn der Laden nicht auf der Karte ist.",
      geoCapReached: "ⓘ Google-Suche ist diesen Monat pausiert (Sicherheitslimit der Seite erreicht) — nutzt stattdessen Kartendaten.",
      geoLinkSet: "✓ Google-Maps-Link gesetzt. Klick auf die Karte, um eine Nadel zu setzen (damit das Wetter funktioniert).",
      geoGoogle: "🔎 Nicht der richtige? Öffne die Suche in Google Maps",
      notComingLabel: "❌ Kommt nicht:", noReason: "(keine Begründung)",
      reasonLabel: "Begründung (optional, nur für Mitglieder)",
      reasonPh: "z. B. Arbeite an dem Tag / krank / zu weit…",
      reasonHint: "Nur Crew-Mitglieder sehen sie — nicht öffentlich.",
      saveReason: "Begründung speichern",
    },
    car: {
      close: "Profil schließen", overline: "Auto-Profil",
      claim: "🚗 Dieses Auto beanspruchen (es ist meins)", claimed: "✓ Dein Auto",
      year: "Baujahr", engine: "Motor", power: "Leistung", drivetrain: "Antrieb", hp: "PS",
      mods: "Modifikationen", editSpecs: "✎ Specs bearbeiten", closeEdit: "Schließen",
      fMake: "Marke", fModel: "Modell", fYear: "Baujahr", fPower: "Leistung (PS)",
      fEngine: "Motor", fDrivetrain: "Antrieb", fMods: "Modifikationen", fVin: "VIN (Fahrgestellnr.)",
      fModsPh: "Downpipe, Gewindefahrwerk, Stage 2…", saveSpecs: "Specs speichern", saving: "Wird gespeichert…",
      catalog: "Ersatzteilkatalog", catalogHint: "Öffnet den externen Katalog mit der VIN des Autos. Wir hosten keine Katalogdaten — wir verlinken nur.",
      catalogNoVin: "Noch keine VIN — der Katalog erscheint, sobald eine VIN hinterlegt ist.", catalogAddVin: "VIN des Autos unter „Specs bearbeiten“ eintragen, um den Katalog zu öffnen.",
      thread: "Build-Thread", fHeadline: "Überschrift", fHeadlinePh: "z. B. Neue Felgen",
      fDate: "Datum", fText: "Text", fTextPh: "Was wurde gemacht?",
      imgChosen: "✓ Bild ausgewählt", addImg: "+ Bild", add: "Hinzufügen",
      emptyThread: "Noch kein Build-Thread", emptyThreadEdit: " — füge den ersten Meilenstein hinzu ✎",
      deleteEntry: "Löschen", saveError: "Speichern fehlgeschlagen: ", addError: "Hinzufügen fehlgeschlagen: ",
    },
    lightbox: {
      gallery: "{title} Galerie", profile: "Profil", profileAria: "Auto-Profil & Build-Thread",
      close: "Galerie schließen", prev: "Zurück", next: "Weiter", goTo: "Zu Bild {n} gehen",
    },
    photo: {
      close: "Schließen", prev: "Zurück", next: "Weiter", untitled: "Ohne Titel",
      member: "Mitglied", car: "Auto", comments: "Kommentare", gallery: "Fotogalerie",
    },
    comments: {
      empty: "Noch keine Kommentare — sei der Erste 💬",
      placeholder: "Schreib einen Kommentar…", loginPlaceholder: "Zum Kommentieren anmelden",
      aria: "Kommentar", send: "Senden", delete: "Kommentar löschen", me: "ich", member: "Mitglied",
    },
    like: { remove: "Like entfernen", add: "Gefällt mir", loginTitle: "Zum Liken anmelden" },
    weather: {
      clear: "Klar", fair: "Heiter", partly: "Teils bewölkt", cloudy: "Bewölkt", fog: "Nebel",
      lightrain: "Leichter Regen", rain: "Regen", heavyrain: "Starker Regen",
      lightrainshowers: "Leichte Schauer", rainshowers: "Schauer", heavyrainshowers: "Starke Schauer",
      sleet: "Schneeregen", sleetshowers: "Schneeregenschauer", snow: "Schnee", snowshowers: "Schneeschauer",
      heavysnow: "Starker Schneefall", thunder: "Gewitter", unknown: "—",
    },
    common: { member: "Mitglied", loginShort: "Anmelden", back: "‹ Mitglied", meetsList: "Meets-Liste" },
    pushPrompt: {
      title: "Erfahre von neuen Meets 🔔",
      body: "Aktiviere Benachrichtigungen, dann weißt du sofort Bescheid bei einem neuen Meet oder Beitrag.",
      enable: "Aktivieren", enabling: "Moment…", later: "Nicht jetzt",
    },
  },
};

function lookup(lang, path) {
  const parts = path.split(".");
  let node = M[lang];
  for (const p of parts) {
    if (node == null) return undefined;
    node = node[p];
  }
  return node;
}

function interpolate(str, vars) {
  if (!vars || typeof str !== "string") return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

const I18nContext = createContext({ lang: DEFAULT_LANG, setLang: () => {}, t: (k) => k, locale: LOCALES.da });

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);

  // On mount, adopt the saved choice, else the browser language, else default.
  useEffect(() => {
    let next = DEFAULT_LANG;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && M[saved]) next = saved;
      else {
        const navs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
        for (const l of navs) {
          const code = (l || "").slice(0, 2).toLowerCase();
          if (M[code]) { next = code; break; }
        }
      }
    } catch {}
    setLangState(next);
  }, []);

  // Keep <html lang> in sync for a11y / SEO.
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((code) => {
    if (!M[code]) return;
    setLangState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch {}
  }, []);

  const t = useCallback(
    (path, vars) => {
      let val = lookup(lang, path);
      if (val === undefined) val = lookup("en", path);
      if (val === undefined) val = lookup(DEFAULT_LANG, path);
      if (val === undefined) return path;
      return interpolate(val, vars);
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t, locale: localeOf(lang) }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  return useContext(I18nContext);
}
