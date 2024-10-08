import axios, { type AxiosResponse } from "axios";

export class HttpService {
  get<T>(url: string): Promise<T> {
    return axios
      .get(url)
      .then((resp: AxiosResponse<T>) => resp.data)
      .catch((resp) => resp.error);
  }

  // biome-ignore lint/suspicious/noExplicitAny: <reason>
  post<T>(url: string, data: any): Promise<T> {
    return axios
      .post(url, data)
      .then((resp: AxiosResponse<T>) => resp.data)
      .catch((error) => Promise.reject(error));
  }
}
