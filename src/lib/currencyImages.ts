// Currency image imports
import bill100 from "@/assets/currency/bill-100.png";
import bill50 from "@/assets/currency/bill-50.png";
import bill20 from "@/assets/currency/bill-20.png";
import bill10 from "@/assets/currency/bill-10.png";
import bill5 from "@/assets/currency/bill-5.png";
import bill1 from "@/assets/currency/bill-1.png";
import coinQuarter from "@/assets/currency/coin-quarter.png";
import coinDime from "@/assets/currency/coin-dime.png";
import coinNickel from "@/assets/currency/coin-nickel.png";
import coinPenny from "@/assets/currency/coin-penny.png";

export const CURRENCY_IMAGES: { [key: string]: string } = {
  "100": bill100,
  "50": bill50,
  "20": bill20,
  "10": bill10,
  "5": bill5,
  "1": bill1,
  "0.25": coinQuarter,
  "0.10": coinDime,
  "0.1": coinDime,
  "0.05": coinNickel,
  "0.01": coinPenny,
};

export function getCurrencyImage(denomination: string): string | undefined {
  return CURRENCY_IMAGES[denomination];
}
