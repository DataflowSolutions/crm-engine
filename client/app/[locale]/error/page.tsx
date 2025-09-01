"use client";
import { useTranslations } from "next-intl";

export default function ErrorPage() {
  const t = useTranslations();
  return <p>{t("Errors.unknown")}</p>;
}
