/**
 * Utility für robuste Edge Function Aufrufe mit Retry-Logik
 */

import { supabase } from "@/integrations/supabase/client";

interface InvokeOptions {
  body?: Record<string, unknown>;
  maxRetries?: number;
  retryDelayMs?: number;
}

interface InvokeResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Prüft ob ein Fehler als "retry-fähig" gilt (temporäre Netzwerk-/Server-Probleme)
 */
function isRetryableError(error: unknown): boolean {
  if (!error) return false;
  
  const errorObj = error as { name?: string; message?: string };
  const name = errorObj.name || '';
  const message = errorObj.message || '';
  
  // Supabase-spezifische Relay/Fetch Errors
  if (name === 'FunctionsRelayError' || name === 'FunctionsFetchError') return true;
  
  // Nachrichtenbasierte Erkennung
  if (message.includes('Relay') || message.includes('relay')) return true;
  if (message.includes('Failed to send') || message.includes('Failed to fetch')) return true;
  if (message.includes('NetworkError') || message.includes('network')) return true;
  if (message.includes('edge function') && message.includes('no request')) return true;
  if (message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT')) return true;
  
  return false;
}

/**
 * Gibt eine benutzerfreundliche deutsche Fehlermeldung zurück
 */
function getGermanErrorMessage(error: unknown): string {
  if (!error) return "Unbekannter Fehler";
  
  const errorObj = error as { name?: string; message?: string };
  const name = errorObj.name || '';
  const message = errorObj.message || '';
  
  // Relay-Fehler (Server nicht erreichbar)
  if (name === 'FunctionsRelayError' || message.includes('Relay') || message.includes('relay')) {
    return "Verbindung zum Server konnte nicht hergestellt werden. Bitte versuche es erneut.";
  }
  
  // Fetch-Fehler (Netzwerkprobleme)
  if (name === 'FunctionsFetchError' || message.includes('Failed to send') || message.includes('Failed to fetch')) {
    return "Netzwerkfehler. Bitte prüfe deine Internetverbindung.";
  }
  
  // Edge function "no request" Fehler
  if (message.includes('edge function') && message.includes('no request')) {
    return "Server antwortet nicht. Bitte warte einen Moment und versuche es erneut.";
  }
  
  // Timeout
  if (message.includes('ETIMEDOUT') || message.includes('timeout')) {
    return "Zeitüberschreitung bei der Serververbindung. Bitte versuche es erneut.";
  }
  
  // Auth-Fehler
  if (message.includes('not authenticated') || message.includes('Unauthorized') || message.includes('401')) {
    return "Du bist nicht angemeldet. Bitte melde dich erneut an.";
  }
  
  // Standard: Original-Nachricht oder generisch
  return message || "Ein unerwarteter Fehler ist aufgetreten.";
}

/**
 * Ruft eine Edge Function mit automatischen Retries auf
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  options: InvokeOptions = {}
): Promise<InvokeResult<T>> {
  const { body, maxRetries = 2, retryDelayMs = 1000 } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Bei Retry kurz warten
      if (attempt > 0) {
        console.log(`[EdgeFunction] Retry ${attempt}/${maxRetries} for ${functionName}...`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
      
      console.log(`[EdgeFunction] Calling ${functionName} (attempt ${attempt + 1})`);
      
      const { data, error } = await supabase.functions.invoke(functionName, { body });
      
      if (error) {
        console.error(`[EdgeFunction] Error from ${functionName}:`, {
          name: (error as { name?: string }).name,
          message: error.message,
          attempt: attempt + 1,
          responseData: data,
          responseDataType: typeof data,
        });
        
        // Prüfe ob der Response-Body eine spezifische Fehlermeldung enthält
        let bodyError: string | null = null;
        
        if (data) {
          if (typeof data === 'object' && 'error' in data) {
            bodyError = (data as { error: string }).error;
          } else if (typeof data === 'string') {
            // Versuche JSON zu parsen wenn es ein String ist
            try {
              const parsed = JSON.parse(data);
              if (parsed && typeof parsed === 'object' && 'error' in parsed) {
                bodyError = parsed.error;
              }
            } catch {
              // Falls kein JSON, nutze den String direkt wenn er kurz genug ist
              if (data.length < 200) {
                bodyError = data;
              }
            }
          }
        }
        
        if (bodyError) {
          console.log(`[EdgeFunction] Extracted error from body:`, bodyError);
          return { data: null, error: new Error(bodyError) };
        }
        
        // Prüfen ob Retry sinnvoll ist
        if (isRetryableError(error) && attempt < maxRetries) {
          lastError = new Error(getGermanErrorMessage(error));
          continue; // Nächster Versuch
        }
        
        // Nicht retry-fähig oder letzte Chance verbraucht
        return { data: null, error: new Error(getGermanErrorMessage(error)) };
      }
      
      // Prüfe auch erfolgreiche Responses auf Error-Body (für non-2xx mit data)
      if (data && typeof data === 'object' && 'error' in data && !('success' in data)) {
        console.log(`[EdgeFunction] Error in response body from ${functionName}:`, (data as { error: string }).error);
        return { data: null, error: new Error((data as { error: string }).error) };
      }
      
      // Erfolg!
      console.log(`[EdgeFunction] Success: ${functionName}`);
      return { data: data as T, error: null };
      
    } catch (err: unknown) {
      console.error(`[EdgeFunction] Exception in ${functionName}:`, err);
      
      const errorMessage = getGermanErrorMessage(err);
      lastError = new Error(errorMessage);
      
      // Prüfen ob Retry sinnvoll ist
      if (isRetryableError(err) && attempt < maxRetries) {
        continue; // Nächster Versuch
      }
      
      // Nicht retry-fähig
      return { data: null, error: lastError };
    }
  }
  
  // Alle Retries aufgebraucht
  console.error(`[EdgeFunction] All retries exhausted for ${functionName}`);
  return { 
    data: null, 
    error: lastError || new Error("Alle Verbindungsversuche fehlgeschlagen.") 
  };
}
